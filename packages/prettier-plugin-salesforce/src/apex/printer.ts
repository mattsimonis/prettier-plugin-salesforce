import type { AstPath, Doc, Printer } from "prettier";
import { applyFinalNewlinePreference } from "../shared/final-newline.js";
import type { ApexDocument, ApexNode, ApexToken } from "./ast.js";

export const apexPrinter: Printer<ApexDocument | ApexNode> = {
  print(path: AstPath<ApexDocument | ApexNode>, options): Doc {
    const node = path.node;
    if (isApexDocument(node)) {
      return formatApexSource(node, options);
    }
    return node.text ?? "";
  }
};

function isApexDocument(node: ApexDocument | ApexNode): node is ApexDocument {
  return node.kind === "apex-document";
}

type IndentOptions = {
  tabWidth?: unknown;
  useTabs?: unknown;
  printWidth?: unknown;
  salesforceFinalNewline?: unknown;
  salesforceTestVisiblePlacement?: unknown;
  salesforceBlankLineBeforeLineComment?: unknown;
  salesforceLogicalOperatorPosition?: unknown;
};

type LogicalOperatorPosition = "end-of-line" | "start-of-line";

export function formatApexSource(document: ApexDocument | string, options: IndentOptions = {}): string {
  const indentText = indentUnit(options);
  const printWidth = resolvePrintWidth(options);
  if (typeof document !== "string") {
    const fromNodes = formatApexSourceFromNodes(document, indentText, printWidth, options);
    if (fromNodes !== undefined) {
      return applyFinalNewlinePreference(fromNodes, options);
    }
  }

  const source = typeof document === "string" ? document : document.source;
  const tokens = typeof document === "string" ? [] : document.tokens;
  const breakableSemicolonOffsets =
    typeof document === "string" ? undefined : collectBreakableSemicolonOffsets(document.root.children, source, 0, source.length);
  return applyFinalNewlinePreference(
    formatApexSlice(source, tokens, findTrimStart(source), findTrimEnd(source), breakableSemicolonOffsets, indentText, printWidth, options),
    options
  );
}

function formatApexSlice(
  source: string,
  tokens: ApexToken[],
  sliceStart: number,
  sliceEnd: number,
  breakableSemicolonOffsets?: Set<number>,
  indentText = "  ",
  printWidth = 80,
  options: IndentOptions = {}
): string {
  const commentStarts = new Map<number, ApexToken>();
  const parenRanges = pairDelimiterRanges(tokens, "open-paren", "close-paren");
  for (const token of tokens) {
    if (token.kind === "line-comment" || token.kind === "block-comment") {
      commentStarts.set(token.range.start.offset, token);
    }
  }

  const lines: string[] = [];
  let current = "";
  let indent = 0;
  let index = sliceStart;
  const trimEnd = sliceEnd;
  let justClosedBlock = false;

  while (index < trimEnd) {
    const comment = commentStarts.get(index);
    if (comment?.kind === "line-comment") {
      const stop = Math.min(comment.range.end.offset, trimEnd);
      const commentText = source.slice(index, stop).trimEnd();
      if (isTrailingLineComment(source, index, sliceStart)) {
        if (current.trim() !== "") {
          flushLine(lines, `${current.trimEnd()} ${commentText}`, indent, indentText, printWidth, options);
        } else if (lines.length > 0) {
          lines[lines.length - 1] = `${lines[lines.length - 1].trimEnd()} ${commentText}`;
        } else {
          lines.push(`${spaces(indent, indentText)}${commentText}`);
        }
      } else {
        flushLine(lines, current, indent, indentText, printWidth, options);
        maybeInsertBlankLineBeforeStandaloneComment(lines, options);
        lines.push(...wrapStandaloneLineComment(commentText, indent, indentText, printWidth));
      }
      current = "";
      index = stop;
      continue;
    }

    if (comment?.kind === "block-comment") {
      flushLine(lines, current, indent, indentText, printWidth, options);
      current = "";
      const stop = Math.min(comment.range.end.offset, trimEnd);
      lines.push(...formatBlockCommentLines(source.slice(index, stop), indent, indentText));
      index = stop;
      continue;
    }

    const char = source[index];

    if (char === "'" || char === "\"") {
      const [literal, nextIndex] = readString(source, index, char);
      current += literal;
      index = Math.min(nextIndex, trimEnd);
      continue;
    }

    if (char === "[" && isBracketedQueryStart(source, index)) {
      const [bracketed, nextIndex] = readBracketedExpression(source, index);
      current += bracketed;
      index = Math.min(nextIndex, trimEnd);
      continue;
    }

    if (char === "{") {
      const collectionInitializerBlock = readCollectionInitializerBlock(source, current, index, trimEnd);
      if (collectionInitializerBlock !== null) {
        current = `${current.trimEnd()} ${collectionInitializerBlock.text}`;
        index = collectionInitializerBlock.nextIndex;
        justClosedBlock = false;
        continue;
      }
      const simpleAccessorBlock = readSimplePropertyAccessorBlock(source, index, trimEnd);
      if (simpleAccessorBlock !== null) {
        current = `${current.trimEnd()} ${simpleAccessorBlock.text}`;
        flushLine(lines, current, indent, indentText, printWidth, options);
        current = "";
        index = simpleAccessorBlock.nextIndex;
        justClosedBlock = false;
        continue;
      }
      current = `${current.trimEnd()} {`;
      flushLine(lines, current, indent, indentText, printWidth, options);
      current = "";
      indent += 1;
      justClosedBlock = false;
      index += 1;
      continue;
    }

    if (char === "}") {
      flushLine(lines, current, indent, indentText, printWidth, options);
      current = "";
      indent = Math.max(indent - 1, 0);
      lines.push(`${spaces(indent, indentText)}}`);
      justClosedBlock = true;
      index += 1;
      continue;
    }

    if (char === ";" && !isOffsetWithinAnyRange(index, parenRanges)) {
      if (current.trim() === "" && lines.at(-1)?.trim() === "}") {
        lines[lines.length - 1] = `${lines[lines.length - 1]};`;
        justClosedBlock = false;
        index += 1;
        continue;
      }
      current = `${current.trimEnd()};`;
      flushLine(lines, current, indent, indentText, printWidth, options);
      current = "";
      index += 1;
      continue;
    }

    if (justClosedBlock && current.trim() === "") {
      const [joinKeyword, nextIndex] = readJoinKeyword(source, index, trimEnd);
      if (joinKeyword !== undefined && nextIndex !== undefined && lines.length > 0) {
        const previous = lines.at(-1) ?? "";
        if (isJoinBlockedByTrivia(previous)) {
          justClosedBlock = false;
          continue;
        }
        lines.pop();
        current = `${previous} ${joinKeyword}`;
        index = nextIndex;
        justClosedBlock = false;
        continue;
      }
    }

    if (/\s/.test(char)) {
      const [whitespace, nextIndex] = readWhitespaceRun(source, index, trimEnd);
      const nextComment = commentStarts.get(nextIndex);
      if (
        current.trim() === "" &&
        containsBlankLine(whitespace) &&
        lines.length > 0 &&
        lines.at(-1)?.trim() !== "" &&
        !isBlankBetweenBlockAndLineComment(lines, nextComment)
      ) {
        lines.push("");
      } else if (current !== "" && !/\s$/.test(current)) {
        current += " ";
      }
      index = nextIndex;
      continue;
    }

    justClosedBlock = false;
    current += char;
    index += 1;
  }

  flushLine(lines, current, indent, indentText, printWidth, options);
  return spaceApexMembers(compactBlankLines(lines)).join("\n") + "\n";
}

function formatApexSourceFromNodes(document: ApexDocument, indentText: string, printWidth: number, options: IndentOptions = {}): string | undefined {
  const declarationNodes = dedupeDeclarationNodesByEndOffset(
    document.root.children.filter((node) => node.kind.endsWith("_declaration") || node.kind === "statement_block")
  );
  if (declarationNodes.length === 0) {
    return undefined;
  }

  const apexDocComments = document.tokens.filter((token) => token.kind === "block-comment" && token.text.startsWith("/**"));
  const consumedApexDocStarts = new Set<number>();
  const chunks: string[] = [];
  for (const [index, node] of declarationNodes.entries()) {
    const attachedStart = findAttachedDeclarationStart(document.source, apexDocComments, node.range.start.offset, consumedApexDocStarts);
    const headerStart = index === 0 ? findLeadingFileHeaderStart(document.source, node.range.start.offset) : null;
    const start = headerStart ?? attachedStart;
    const end = node.range.end.offset;
    if (end <= start) {
      continue;
    }
    if (document.source.slice(start, end).trim() === "") {
      continue;
    }
    const breakableSemicolonOffsets = collectBreakableSemicolonOffsets(node.children, document.source, start, end);
    chunks.push(
      formatApexSlice(document.source, document.tokens, start, end, breakableSemicolonOffsets, indentText, printWidth, options).trimEnd()
    );
  }
  if (chunks.length === 0) {
    return undefined;
  }
  return `${chunks.join("\n\n")}\n`;
}

function maybeInsertBlankLineBeforeStandaloneComment(lines: string[], options: IndentOptions): void {
  if (options.salesforceBlankLineBeforeLineComment !== true) {
    return;
  }

  const previous = previousNonBlank(lines);
  if (previous === undefined || previous.line.trim() === "" || previous.line.trim().endsWith("{")) {
    return;
  }
  if (previous.line.trim().startsWith("//")) {
    return;
  }
  if (isBlockCommentLine(previous.line)) {
    return;
  }
  if (lines.at(-1)?.trim() !== "") {
    lines.push("");
  }
}

function isBlankBetweenBlockAndLineComment(lines: string[], nextComment: ApexToken | undefined): boolean {
  const previous = previousNonBlank(lines);
  return nextComment?.kind === "line-comment" && previous !== undefined && isBlockCommentLine(previous.line);
}

function findLeadingFileHeaderStart(source: string, nodeStart: number): number | null {
  let cursor = 0;
  let firstCommentStart: number | null = null;

  while (cursor < nodeStart) {
    const char = source[cursor];
    if (/\s/.test(char)) {
      cursor += 1;
      continue;
    }
    if (source.startsWith("//", cursor)) {
      firstCommentStart ??= cursor;
      const lineEnd = source.indexOf("\n", cursor + 2);
      cursor = lineEnd === -1 ? nodeStart : lineEnd + 1;
      continue;
    }
    if (source.startsWith("/*", cursor)) {
      firstCommentStart ??= cursor;
      const blockEnd = source.indexOf("*/", cursor + 2);
      cursor = blockEnd === -1 ? nodeStart : blockEnd + 2;
      continue;
    }
    return null;
  }

  return firstCommentStart;
}

function dedupeDeclarationNodesByEndOffset(nodes: ApexNode[]): ApexNode[] {
  const byEndOffset = new Map<number, ApexNode>();
  for (const node of nodes) {
    const endOffset = node.range.end.offset;
    const existing = byEndOffset.get(endOffset);
    if (existing === undefined || node.range.start.offset > existing.range.start.offset) {
      byEndOffset.set(endOffset, node);
    }
  }
  return [...byEndOffset.values()].sort((left, right) => left.range.start.offset - right.range.start.offset);
}

function findAttachedDeclarationStart(
  source: string,
  apexDocComments: ApexToken[],
  nodeStart: number,
  consumedApexDocStarts: Set<number>
): number {
  const annotationStart = findLeadingAnnotationStart(source, nodeStart);
  for (let index = apexDocComments.length - 1; index >= 0; index -= 1) {
    const token = apexDocComments[index];
    const commentStart = token.range.start.offset;
    const commentEnd = token.range.end.offset;
    if (commentEnd > annotationStart) {
      continue;
    }
    if (consumedApexDocStarts.has(commentStart)) {
      continue;
    }
    if (source.slice(commentEnd, annotationStart).trim() !== "") {
      break;
    }
    consumedApexDocStarts.add(commentStart);
    return commentStart;
  }
  return annotationStart;
}

function findLeadingAnnotationStart(source: string, nodeStart: number): number {
  let start = nodeStart;
  while (start > 0) {
    const lineStart = findLineStart(source, start);
    const previousLineStart = findPreviousLineStart(source, lineStart);
    if (previousLineStart === undefined) {
      break;
    }
    const previousLine = source.slice(previousLineStart, lineStart).trim();
    if (!isApexAnnotationLine(previousLine)) {
      break;
    }
    start = previousLineStart;
  }
  return start;
}

function findLineStart(source: string, index: number): number {
  let cursor = index;
  while (cursor > 0 && source[cursor - 1] !== "\n" && source[cursor - 1] !== "\r") {
    cursor -= 1;
  }
  return cursor;
}

function findPreviousLineStart(source: string, lineStart: number): number | undefined {
  if (lineStart <= 0) {
    return undefined;
  }
  let cursor = lineStart - 1;
  if (source[cursor] === "\n") {
    cursor -= 1;
  }
  if (cursor >= 0 && source[cursor] === "\r") {
    cursor -= 1;
  }
  if (cursor < 0) {
    return 0;
  }
  while (cursor > 0 && source[cursor - 1] !== "\n" && source[cursor - 1] !== "\r") {
    cursor -= 1;
  }
  return cursor;
}

function isApexAnnotationLine(line: string): boolean {
  return /^@[A-Za-z_][A-Za-z0-9_.]*(?:\s*\(.*\))?$/.test(line);
}

function collectBreakableSemicolonOffsets(
  nodes: ApexNode[],
  source: string,
  scopeStart: number,
  scopeEnd: number
): Set<number> | undefined {
  const breakableStatementKinds = new Set([
    "return",
    "dml",
    "soql",
    "sosl",
    "throw",
    "break",
    "continue",
    "assignment",
    "assignment-update",
    "plain-call",
    "chained-call",
    "query-call",
    "dml-call",
    "declaration",
    "unknown"
  ]);
  const offsets = new Set<number>();
  const visit = (node: ApexNode): void => {
    if (node.kind === "statement_span" && breakableStatementKinds.has(node.statementKind ?? "unknown")) {
      const semicolonOffset = node.range.end.offset - 1;
      if (semicolonOffset >= scopeStart && semicolonOffset < scopeEnd && source[semicolonOffset] === ";") {
        offsets.add(semicolonOffset);
      }
    }
    for (const child of node.children) {
      visit(child);
    }
  };
  for (const node of nodes) {
    visit(node);
  }
  return offsets.size > 0 ? offsets : undefined;
}

function findTrimStart(source: string): number {
  const index = source.search(/\S/);
  return index === -1 ? source.length : index;
}

function findTrimEnd(source: string): number {
  for (let index = source.length - 1; index >= 0; index -= 1) {
    if (!/\s/.test(source[index])) {
      return index + 1;
    }
  }
  return 0;
}

function readString(source: string, start: number, quote: string): [string, number] {
  let index = start + 1;
  while (index < source.length) {
    if (source[index] === "\\" && index + 1 < source.length) {
      index += 2;
      continue;
    }

    if (source[index] === quote) {
      return [source.slice(start, index + 1), index + 1];
    }
    index += 1;
  }
  return [source.slice(start), source.length];
}

function readWhitespaceRun(source: string, start: number, trimEnd: number): [string, number] {
  let index = start;
  while (index < trimEnd && /\s/.test(source[index])) {
    index += 1;
  }
  return [source.slice(start, index), index];
}

function containsBlankLine(source: string): boolean {
  return /(?:\r\n?|\n)[ \t]*(?:\r\n?|\n)/.test(source);
}

function isBracketedQueryStart(source: string, start: number): boolean {
  return /^\[\s*(?:select|find)\b/i.test(source.slice(start, start + 32));
}

function readBracketedExpression(source: string, start: number): [string, number] {
  let depth = 1;
  let index = start + 1;
  while (index < source.length && depth > 0) {
    const char = source[index];
    if (char === "'" || char === "\"") {
      const [, next] = readString(source, index, char);
      index = next;
      continue;
    }
    if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth -= 1;
    }
    index += 1;
  }
  return [source.slice(start, index), index];
}

function isTrailingLineComment(source: string, commentStart: number, sliceStart: number): boolean {
  let cursor = commentStart - 1;
  while (cursor >= sliceStart) {
    const char = source[cursor];
    if (char === "\n" || char === "\r") {
      return false;
    }
    if (!/\s/.test(char)) {
      return true;
    }
    cursor -= 1;
  }
  return false;
}

function formatBlockCommentLines(source: string, indent: number, indentText: string): string[] {
  const indentPrefix = spaces(indent, indentText);
  const rawLines = source.split(/\r\n?|\n/);
  const isApexDoc = source.startsWith("/**");
  return rawLines.map((line, index) => {
    const trimmed = line.trim();
    if (isApexDoc && index > 0 && trimmed.startsWith("*")) {
      return `${indentPrefix} ${trimmed}`;
    }
    return `${indentPrefix}${trimmed}`;
  });
}

function readSimplePropertyAccessorBlock(source: string, start: number, trimEnd: number): { text: string; nextIndex: number } | null {
  const block = readBalancedBraceBlock(source, start, trimEnd);
  if (block === null) {
    return null;
  }

  const accessors = parseSimplePropertyAccessors(block.inner);
  if (accessors === null) {
    return null;
  }

  return {
    text: `{ ${accessors.join(" ")} }`,
    nextIndex: block.nextIndex
  };
}

function readBalancedBraceBlock(source: string, start: number, trimEnd: number): { inner: string; nextIndex: number } | null {
  let depth = 1;
  let cursor = start + 1;
  while (cursor < trimEnd && depth > 0) {
    const char = source[cursor];
    const next = source[cursor + 1];
    if (char === "'" || char === "\"") {
      const [, nextIndex] = readString(source, cursor, char);
      cursor = nextIndex;
      continue;
    }
    if (char === "/" && next === "/") {
      const lineEnd = source.indexOf("\n", cursor + 2);
      cursor = lineEnd === -1 ? trimEnd : lineEnd + 1;
      continue;
    }
    if (char === "/" && next === "*") {
      const blockEnd = source.indexOf("*/", cursor + 2);
      cursor = blockEnd === -1 ? trimEnd : blockEnd + 2;
      continue;
    }
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          inner: source.slice(start + 1, cursor),
          nextIndex: cursor + 1
        };
      }
    }
    cursor += 1;
  }
  return null;
}

function parseSimplePropertyAccessors(source: string): string[] | null {
  const normalized = source
    .trim()
    .replace(/\s*;\s*/g, "; ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized === "") {
    return null;
  }

  const accessors = normalized
    .split(/(?<=;)\s+/)
    .map((part) => part.trim())
    .filter((part) => part !== "");
  if (accessors.length === 0 || accessors.length > 2) {
    return null;
  }
  if (!accessors.every((accessor) => /^(?:(?:public|private|protected|global)\s+)?(?:get|set);$/.test(accessor))) {
    return null;
  }
  return accessors;
}

function readCollectionInitializerBlock(
  source: string,
  current: string,
  start: number,
  trimEnd: number
): { text: string; nextIndex: number } | null {
  if (!/\bnew\s+(?:List|Set|Map)\s*<[^>{;\n]+>\s*$/.test(current)) {
    return null;
  }

  const block = readBalancedBraceBlock(source, start, trimEnd);
  if (block === null || block.inner.includes(";")) {
    return null;
  }
  if (block.inner.includes("//") || block.inner.includes("/*")) {
    return null;
  }

  const normalized = normalizeInlineWhitespace(block.inner).trim();
  return {
    text: normalized === "" ? "{}" : `{ ${normalized} }`,
    nextIndex: block.nextIndex
  };
}

function flushLine(
  lines: string[],
  line: string,
  indent: number,
  indentText: string,
  printWidth: number,
  options: IndentOptions
): void {
  const trimmed = normalizeInlineWhitespace(line).trim();
  if (trimmed !== "") {
    for (const chunk of splitLeadingAnnotations(trimmed, options)) {
      lines.push(...wrapApexLine(chunk, indent, indentText, printWidth, options));
    }
  }
}

function wrapApexLine(line: string, indent: number, indentText: string, printWidth: number, options: IndentOptions = {}): string[] {
  const prefix = spaces(indent, indentText);
  const logicalOperatorPosition = resolveLogicalOperatorPosition(options);
  if (`${prefix}${line}`.length <= printWidth) {
    return [`${prefix}${line}`];
  }
  if (containsCommentOutsideLiterals(line)) {
    return [`${prefix}${line}`];
  }

  return (
    wrapBracketedQueryLine(line, indent, indentText) ??
    wrapControlConditionLine(line, indent, indentText, logicalOperatorPosition) ??
    wrapForHeaderLine(line, indent, indentText, printWidth) ??
    wrapWhenClauseLine(line, indent, indentText) ??
    wrapAssignmentLine(line, indent, indentText, printWidth, options) ??
    wrapTernaryLine(line, indent, indentText, printWidth, options) ??
    wrapReturnParenthesizedLogicalLine(line, indent, indentText, printWidth, logicalOperatorPosition) ??
    wrapBinaryOperatorLine(line, indent, indentText, printWidth, logicalOperatorPosition) ??
    wrapDottedChainLine(line, indent, indentText, printWidth, options) ??
    wrapParenCommaList(line, indent, indentText, printWidth, options) ??
    wrapCollectionInitializerLine(line, indent, indentText) ??
    wrapOpenParenCommaPrefix(line, indent, indentText) ??
    wrapSingleArgumentParenLine(line, indent, indentText, printWidth, options) ?? [`${prefix}${line}`]
  );
}

function containsCommentOutsideLiterals(line: string): boolean {
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "'" || char === "\"") {
      const [, nextIndex] = readString(line, index, char);
      index = nextIndex - 1;
      continue;
    }
    if (char === "/" && (next === "/" || next === "*")) {
      return true;
    }
  }
  return false;
}

function wrapStandaloneLineComment(commentText: string, indent: number, indentText: string, printWidth: number): string[] {
  const prefix = spaces(indent, indentText);
  const trimmed = commentText.trimEnd();
  if (`${prefix}${trimmed}`.length <= printWidth || !trimmed.startsWith("//")) {
    return [`${prefix}${trimmed}`];
  }

  const content = trimmed.slice(2).trim();
  if (content === "" || /\bhttps?:\/\//.test(content)) {
    return [`${prefix}${trimmed}`];
  }

  const commentPrefix = `${prefix}// `;
  const maxContentWidth = Math.max(printWidth - commentPrefix.length, 20);
  const out: string[] = [];
  let current = "";
  for (const word of content.split(/\s+/)) {
    if (word.length > maxContentWidth) {
      if (current !== "") {
        out.push(`${commentPrefix}${current}`);
        current = "";
      }
      out.push(`${commentPrefix}${word}`);
      continue;
    }
    const next = current === "" ? word : `${current} ${word}`;
    if (next.length > maxContentWidth) {
      out.push(`${commentPrefix}${current}`);
      current = word;
    } else {
      current = next;
    }
  }
  if (current !== "") {
    out.push(`${commentPrefix}${current}`);
  }
  return out.length > 0 ? out : [`${prefix}${trimmed}`];
}

function wrapBracketedQueryLine(line: string, indent: number, indentText: string): string[] | null {
  const query = findSingleLineBracketedQuery(line);
  if (query === null) {
    return null;
  }

  const clauses = splitSoqlClauses(query.inner);
  if (clauses.length < 2) {
    return null;
  }

  const baseIndent = spaces(indent, indentText);
  const childIndent = spaces(indent + 1, indentText);
  return [
    `${baseIndent}${query.before}[`,
    ...clauses.map((clause) => `${childIndent}${clause}`),
    `${baseIndent}]${query.after}`
  ];
}

function findSingleLineBracketedQuery(line: string): { before: string; inner: string; after: string } | null {
  const open = line.indexOf("[");
  const close = line.lastIndexOf("]");
  if (open === -1 || close <= open || !/^\s*(?:select|find)\b/i.test(line.slice(open + 1, close))) {
    return null;
  }
  return {
    before: line.slice(0, open).trimEnd(),
    inner: line.slice(open + 1, close).trim(),
    after: line.slice(close + 1).trim()
  };
}

function splitSoqlClauses(query: string): string[] {
  const normalized = query.replace(/\s+/g, " ").trim();
  const marked = normalized.replace(/\s+(FROM|WHERE|ORDER BY|GROUP BY|HAVING|LIMIT|OFFSET|AND|OR)\s+/gi, "\n$1 ");
  return marked
    .split("\n")
    .map((clause) => clause.trim())
    .filter((clause) => clause !== "");
}

function wrapControlConditionLine(
  line: string,
  indent: number,
  indentText: string,
  logicalOperatorPosition: LogicalOperatorPosition
): string[] | null {
  if (!/^(?:} else |else )?if \(/.test(line)) {
    return null;
  }

  const range = findFirstTopLevelParenRange(line);
  if (!range) {
    return null;
  }
  const after = line.slice(range.close + 1).trim();
  if (after !== "{") {
    return null;
  }

  const parts = splitLogicalExpression(line.slice(range.open + 1, range.close), logicalOperatorPosition);
  if (parts.length < 2) {
    return null;
  }

  const baseIndent = spaces(indent, indentText);
  const childIndent = spaces(indent + 1, indentText);
  const before = line.slice(0, range.open + 1).trimEnd();
  return [
    `${baseIndent}${before}`,
    ...parts.flatMap((part) => wrapConditionPart(part, indent + 1, indentText, logicalOperatorPosition)),
    `${baseIndent}) {`
  ];
}

function wrapConditionPart(
  part: string,
  indent: number,
  indentText: string,
  logicalOperatorPosition: LogicalOperatorPosition
): string[] {
  const prefix = spaces(indent, indentText);
  const wrapped = wrapParenthesizedLogicalOperand(part, prefix, logicalOperatorPosition, indentText);
  return wrapped ?? [`${prefix}${part}`];
}

function wrapWhenClauseLine(line: string, indent: number, indentText: string): string[] | null {
  const match = /^when\s+(.+)\s+\{$/.exec(line);
  if (!match) {
    return null;
  }

  const parts = splitTopLevelCommaList(match[1]);
  if (parts.length < 2) {
    return null;
  }

  const baseIndent = spaces(indent, indentText);
  const childIndent = spaces(indent + 1, indentText);
  return parts.map((part, index) => {
    if (index === 0) {
      return `${baseIndent}when ${part},`;
    }
    const suffix = index < parts.length - 1 ? "," : " {";
    return `${childIndent}${part}${suffix}`;
  });
}

function wrapForHeaderLine(line: string, indent: number, indentText: string, printWidth: number): string[] | null {
  if (!line.startsWith("for (")) {
    return null;
  }

  const range = findFirstTopLevelParenRange(line);
  if (!range) {
    return null;
  }
  const after = line.slice(range.close + 1).trim();
  if (after !== "{") {
    return null;
  }

  const inner = line.slice(range.open + 1, range.close);
  if (inner.includes(";")) {
    return null;
  }
  const colon = findTopLevelColonIndex(inner);
  if (colon === null) {
    return null;
  }

  const left = inner.slice(0, colon).trim();
  const right = inner.slice(colon + 1).trim();
  if (left === "" || right === "") {
    return null;
  }

  const baseIndent = spaces(indent, indentText);
  return [
    `${baseIndent}${line.slice(0, range.open + 1)}${left} :`,
    ...wrapApexLine(right, indent + 1, indentText, printWidth),
    `${baseIndent}) {`
  ];
}

function findTopLevelColonIndex(source: string): number | null {
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let angleDepth = 0;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "'" || char === "\"") {
      const [, nextIndex] = readString(source, index, char);
      index = nextIndex - 1;
      continue;
    }
    if (char === "(") {
      parenDepth += 1;
    } else if (char === ")") {
      parenDepth = Math.max(parenDepth - 1, 0);
    } else if (char === "[") {
      bracketDepth += 1;
    } else if (char === "]") {
      bracketDepth = Math.max(bracketDepth - 1, 0);
    } else if (char === "{") {
      braceDepth += 1;
    } else if (char === "}") {
      braceDepth = Math.max(braceDepth - 1, 0);
    } else if (char === "<") {
      angleDepth += 1;
    } else if (char === ">") {
      angleDepth = Math.max(angleDepth - 1, 0);
    } else if (char === ":" && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0 && angleDepth === 0) {
      return index;
    }
  }

  return null;
}

function wrapCollectionInitializerLine(line: string, indent: number, indentText: string, force = false): string[] | null {
  const initializer = findCollectionInitializer(line);
  if (initializer === null) {
    return null;
  }

  const parts = splitTopLevelCommaList(initializer.inner);
  if (parts.length < 2 && !force) {
    return null;
  }

  const baseIndent = spaces(indent, indentText);
  const childIndent = spaces(indent + 1, indentText);
  return [
    `${baseIndent}${initializer.before} {`,
    ...parts.map((part, index) => `${childIndent}${part}${index < parts.length - 1 ? "," : ""}`),
    `${baseIndent}}${initializer.after}`
  ];
}

function findCollectionInitializer(line: string): { before: string; inner: string; after: string } | null {
  const match = /\bnew\s+(?:List|Set|Map)\s*<[^>{;\n]+>\s*\{/.exec(line);
  if (match?.index === undefined) {
    return null;
  }

  const open = line.indexOf("{", match.index + match[0].length - 1);
  if (open === -1) {
    return null;
  }

  const block = readBalancedBraceBlock(line, open, line.length);
  if (block === null) {
    return null;
  }

  return {
    before: line.slice(0, open).trimEnd(),
    inner: block.inner.trim(),
    after: line.slice(block.nextIndex).trim()
  };
}

function wrapParenCommaList(line: string, indent: number, indentText: string, printWidth: number, options: IndentOptions = {}): string[] | null {
  const range = findFirstTopLevelParenRange(line);
  if (!range) {
    return null;
  }

  const inner = line.slice(range.open + 1, range.close);
  const parts = splitTopLevelCommaList(inner);
  if (parts.length < 2) {
    return null;
  }

  const baseIndent = spaces(indent, indentText);
  const before = line.slice(0, range.open + 1).trimEnd();
  const after = line.slice(range.close + 1).trimStart();
  return [
    `${baseIndent}${before}`,
    ...wrapCommaParts(parts, indent + 1, indentText, printWidth, options),
    `${baseIndent})${formatParenSuffix(after)}`
  ];
}

function wrapCommaParts(parts: string[], indent: number, indentText: string, printWidth: number, options: IndentOptions = {}): string[] {
  const childIndent = spaces(indent, indentText);
  return parts.flatMap((part, index) => {
    const hasComma = index < parts.length - 1;
    const oneLine = `${childIndent}${part}${hasComma ? "," : ""}`;
    if (oneLine.length <= printWidth) {
      return [oneLine];
    }

    const wrapped = wrapApexLine(part, indent, indentText, printWidth, options);
    if (hasComma && wrapped.length > 0) {
      wrapped[wrapped.length - 1] = `${wrapped[wrapped.length - 1]},`;
    }
    return wrapped;
  });
}

function wrapOpenParenCommaPrefix(line: string, indent: number, indentText: string): string[] | null {
  const open = findFirstUnclosedParenIndex(line);
  if (open === null) {
    return null;
  }

  const inner = line.slice(open + 1);
  const parts = splitTopLevelCommaList(inner);
  if (parts.length < 2) {
    return null;
  }

  const baseIndent = spaces(indent, indentText);
  const childIndent = spaces(indent + 1, indentText);
  const before = line.slice(0, open + 1).trimEnd();
  return [
    `${baseIndent}${before}`,
    ...parts.map((part, index) => `${childIndent}${part}${index < parts.length - 1 ? "," : ""}`)
  ];
}

function findFirstUnclosedParenIndex(line: string): number | null {
  let open: number | null = null;
  let depth = 0;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "'" || char === "\"") {
      const [, nextIndex] = readString(line, index, char);
      index = nextIndex - 1;
      continue;
    }
    if (char === "(") {
      if (depth === 0) {
        open = index;
      }
      depth += 1;
    } else if (char === ")") {
      depth = Math.max(depth - 1, 0);
      if (depth === 0) {
        open = null;
      }
    }
  }
  return depth > 0 ? open : null;
}

function wrapSingleArgumentParenLine(
  line: string,
  indent: number,
  indentText: string,
  printWidth: number,
  options: IndentOptions = {}
): string[] | null {
  const range = findFirstTopLevelParenRange(line);
  if (!range) {
    return null;
  }

  const inner = line.slice(range.open + 1, range.close).trim();
  if (inner === "" || splitTopLevelCommaList(inner).length > 1) {
    return null;
  }

  const baseIndent = spaces(indent, indentText);
  const before = line.slice(0, range.open + 1).trimEnd();
  const after = line.slice(range.close + 1).trimStart();
  const collectionInitializer = findCollectionInitializer(inner);
  const wrappedInner =
    collectionInitializer === null
      ? wrapApexLine(inner, indent + 1, indentText, printWidth, options)
      : (wrapCollectionInitializerLine(inner, indent + 1, indentText, true) ?? wrapApexLine(inner, indent + 1, indentText, printWidth, options));
  return [
    `${baseIndent}${before}`,
    ...wrappedInner,
    `${baseIndent})${formatParenSuffix(after)}`
  ];
}

function formatParenSuffix(after: string): string {
  if (after === "") {
    return "";
  }
  return /^[;,.\[]/.test(after) ? after : ` ${after}`;
}

function wrapAssignmentLine(line: string, indent: number, indentText: string, printWidth: number, options: IndentOptions = {}): string[] | null {
  const assignment = findTopLevelAssignmentIndex(line);
  if (assignment === null) {
    return null;
  }

  const left = line.slice(0, assignment + 1).trimEnd();
  const right = line.slice(assignment + 1).trim();
  if (left === "" || right === "") {
    return null;
  }

  const baseIndent = spaces(indent, indentText);
  const logicalOperatorPosition = resolveLogicalOperatorPosition(options);
  const wrappedRight =
    wrapParenCommaList(right, indent, indentText, printWidth, options) ??
    wrapTernaryLine(right, indent, indentText, printWidth, options) ??
    wrapBinaryOperatorLine(right, indent, indentText, printWidth, logicalOperatorPosition) ??
    wrapDottedChainLine(right, indent, indentText, printWidth, options);
  if (wrappedRight !== null && wrappedRight.length > 1) {
    const firstRight = wrappedRight[0].trim();
    const firstLine = `${baseIndent}${left} ${firstRight}`;
    if (firstLine.length <= printWidth) {
      return [firstLine, ...wrappedRight.slice(1)];
    }
  }
  return [`${baseIndent}${left}`, ...wrapApexLine(right, indent + 1, indentText, printWidth, options)];
}

function findTopLevelAssignmentIndex(line: string): number | null {
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let angleDepth = 0;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "'" || char === "\"") {
      const [, nextIndex] = readString(line, index, char);
      index = nextIndex - 1;
      continue;
    }
    if (char === "(") {
      parenDepth += 1;
    } else if (char === ")") {
      parenDepth = Math.max(parenDepth - 1, 0);
    } else if (char === "[") {
      bracketDepth += 1;
    } else if (char === "]") {
      bracketDepth = Math.max(bracketDepth - 1, 0);
    } else if (char === "{") {
      braceDepth += 1;
    } else if (char === "}") {
      braceDepth = Math.max(braceDepth - 1, 0);
    } else if (char === "<") {
      angleDepth += 1;
    } else if (char === ">") {
      angleDepth = Math.max(angleDepth - 1, 0);
    } else if (
      char === "=" &&
      parenDepth === 0 &&
      bracketDepth === 0 &&
      braceDepth === 0 &&
      angleDepth === 0 &&
      !["=", "!", "<", ">", "+", "-", "*", "/", "%", "&", "|", "^"].includes(line[index - 1] ?? "") &&
      line[index + 1] !== ">" &&
      line[index + 1] !== "="
    ) {
      return index;
    }
  }

  return null;
}

function findFirstTopLevelParenRange(line: string): { open: number; close: number } | null {
  let open: number | null = null;
  let depth = 0;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "'" || char === "\"") {
      const [, nextIndex] = readString(line, index, char);
      index = nextIndex - 1;
      continue;
    }
    if (char === "(") {
      if (depth === 0) {
        open = index;
      }
      depth += 1;
      continue;
    }
    if (char === ")") {
      depth -= 1;
      if (depth === 0 && open !== null) {
        return { open, close: index };
      }
    }
  }
  return null;
}

function splitTopLevelCommaList(source: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let angleDepth = 0;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "'" || char === "\"") {
      const [, nextIndex] = readString(source, index, char);
      index = nextIndex - 1;
      continue;
    }
    if (char === "(") {
      parenDepth += 1;
    } else if (char === ")") {
      parenDepth = Math.max(parenDepth - 1, 0);
    } else if (char === "[") {
      bracketDepth += 1;
    } else if (char === "]") {
      bracketDepth = Math.max(bracketDepth - 1, 0);
    } else if (char === "{") {
      braceDepth += 1;
    } else if (char === "}") {
      braceDepth = Math.max(braceDepth - 1, 0);
    } else if (char === "<") {
      angleDepth += 1;
    } else if (char === ">") {
      angleDepth = Math.max(angleDepth - 1, 0);
    } else if (char === "," && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0 && angleDepth === 0) {
      const part = source.slice(start, index).trim();
      if (part !== "") {
        parts.push(part);
      }
      start = index + 1;
    }
  }

  const tail = source.slice(start).trim();
  if (tail !== "") {
    parts.push(tail);
  }
  return parts;
}

function wrapTernaryLine(line: string, indent: number, indentText: string, printWidth: number, options: IndentOptions = {}): string[] | null {
  const ternary = findTopLevelTernary(line);
  if (ternary === null) {
    return null;
  }

  const condition = line.slice(0, ternary.question).trim();
  const whenTrue = line.slice(ternary.question + 1, ternary.colon).trim();
  const whenFalse = line.slice(ternary.colon + 1).trim();
  if (condition === "" || whenTrue === "" || whenFalse === "") {
    return null;
  }

  const baseIndent = spaces(indent, indentText);
  const childIndent = spaces(indent + 1, indentText);
  const compactHead = `${condition} ? ${whenTrue} :`;
  if (`${baseIndent}${compactHead}`.length <= printWidth) {
    return [`${baseIndent}${compactHead}`, ...wrapApexLine(whenFalse, indent + 1, indentText, printWidth, options)];
  }

  return [
    `${baseIndent}${condition} ?`,
    `${childIndent}${whenTrue} :`,
    ...wrapApexLine(whenFalse, indent + 1, indentText, printWidth, options)
  ];
}

function wrapReturnParenthesizedLogicalLine(
  line: string,
  indent: number,
  indentText: string,
  printWidth: number,
  logicalOperatorPosition: LogicalOperatorPosition
): string[] | null {
  if (!line.startsWith("return (")) {
    return null;
  }

  const range = findFirstTopLevelParenRange(line);
  if (!range || range.open !== "return ".length) {
    return null;
  }

  const inner = line.slice(range.open + 1, range.close);
  const innerParts = splitLogicalExpression(inner, logicalOperatorPosition);
  if (innerParts.length < 2) {
    return null;
  }

  const after = line.slice(range.close + 1).trimStart();
  const baseIndent = spaces(indent, indentText);
  const childIndent = spaces(indent + 1, indentText);
  const closeLine = after === "" ? `${baseIndent})` : `${baseIndent}) ${after}`;
  const wrapped = [`${baseIndent}return (`, ...innerParts.map((part) => `${childIndent}${part}`)];

  if (closeLine.length <= printWidth) {
    wrapped.push(closeLine);
  } else {
    const afterOperator = /^(?:&&|\|\|)\b/.exec(after);
    if (!afterOperator) {
      wrapped.push(closeLine);
    } else {
      wrapped.push(`${baseIndent}) ${afterOperator[0]}`);
      wrapped.push(`${childIndent}${after.slice(afterOperator[0].length).trimStart()}`);
    }
  }
  return wrapped;
}

function findTopLevelTernary(line: string): { question: number; colon: number } | null {
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let question: number | null = null;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "'" || char === "\"") {
      const [, nextIndex] = readString(line, index, char);
      index = nextIndex - 1;
      continue;
    }
    if (char === "(") {
      parenDepth += 1;
    } else if (char === ")") {
      parenDepth = Math.max(parenDepth - 1, 0);
    } else if (char === "[") {
      bracketDepth += 1;
    } else if (char === "]") {
      bracketDepth = Math.max(bracketDepth - 1, 0);
    } else if (char === "{") {
      braceDepth += 1;
    } else if (char === "}") {
      braceDepth = Math.max(braceDepth - 1, 0);
    }
    if (parenDepth !== 0 || bracketDepth !== 0 || braceDepth !== 0) {
      continue;
    }
    if (char === "?" && question === null) {
      question = index;
      continue;
    }
    if (char === ":" && question !== null) {
      return { question, colon: index };
    }
  }

  return null;
}

function wrapDottedChainLine(line: string, indent: number, indentText: string, printWidth: number, options: IndentOptions = {}): string[] | null {
  if (findTopLevelTernary(line) !== null || findTopLevelBinaryOperatorIndexes(line).some((operator) => operator.operator === "&&" || operator.operator === "||")) {
    return null;
  }

  const dotIndexes = findTopLevelMemberDotIndexes(line);
  if (dotIndexes.length < 2) {
    return null;
  }

  const baseIndent = spaces(indent, indentText);
  const childIndent = spaces(indent + 1, indentText);
  const parts: string[] = [];
  let start = 0;
  for (const dotIndex of dotIndexes) {
    const part = line.slice(start, dotIndex).trim();
    if (part !== "") {
      parts.push(part);
    }
    start = dotIndex;
  }
  const tail = line.slice(start).trim();
  if (tail !== "") {
    parts.push(tail);
  }
  if (parts.length < 3) {
    return null;
  }
  if (
    parts.length > 2 &&
    (/^\.newInstance\(\)$/.test(parts[1]) || /^\.[A-Za-z_][A-Za-z0-9_]*$/.test(parts[1])) &&
    `${baseIndent}${parts[0]}${parts[1]}`.length <= printWidth
  ) {
    parts.splice(0, 2, `${parts[0]}${parts[1]}`);
  }

  const singletonCall = wrapSingletonMethodCall(parts, indent, indentText, printWidth);
  if (singletonCall !== null) {
    return singletonCall;
  }

  return parts.flatMap((part, index) => {
    const partIndent = index === 0 ? indent : indent + 1;
    const oneLine = `${index === 0 ? baseIndent : childIndent}${part}`;
    return oneLine.length <= printWidth ? [oneLine] : wrapApexLine(part, partIndent, indentText, printWidth, options);
  });
}

function wrapSingletonMethodCall(parts: string[], indent: number, indentText: string, printWidth: number): string[] | null {
  if (parts.length !== 2 || !/^\.[A-Za-z_][A-Za-z0-9_]*\(/.test(parts[1])) {
    return null;
  }

  const range = findFirstTopLevelParenRange(parts[1]);
  if (!range) {
    return null;
  }

  const inner = parts[1].slice(range.open + 1, range.close);
  const args = splitTopLevelCommaList(inner).map((arg) => normalizeArgumentWhitespace(arg));
  if (args.length === 0) {
    return null;
  }

  const baseIndent = spaces(indent, indentText);
  const firstLine = `${baseIndent}${parts[0]}${parts[1].slice(0, range.open + 1).trimEnd()}`;
  if (firstLine.length > printWidth) {
    return null;
  }

  const after = parts[1].slice(range.close + 1).trimStart();
  if (args.length === 1 && `${firstLine}${args[0]})${formatParenSuffix(after)}`.length <= printWidth) {
    return null;
  }
  return [firstLine, ...wrapCommaParts(args, indent + 1, indentText, printWidth), `${baseIndent})${formatParenSuffix(after)}`];
}

function normalizeArgumentWhitespace(arg: string): string {
  return normalizeInlineWhitespace(arg)
    .replace(/(['"])\s*\+\s*/g, "$1 + ")
    .replace(/\s*\+\s*(['"])/g, " + $1");
}

function findTopLevelMemberDotIndexes(line: string): number[] {
  const dots: number[] = [];
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "'" || char === "\"") {
      const [, nextIndex] = readString(line, index, char);
      index = nextIndex - 1;
      continue;
    }
    if (char === "(") {
      parenDepth += 1;
    } else if (char === ")") {
      parenDepth = Math.max(parenDepth - 1, 0);
    } else if (char === "[") {
      bracketDepth += 1;
    } else if (char === "]") {
      bracketDepth = Math.max(bracketDepth - 1, 0);
    } else if (char === "{") {
      braceDepth += 1;
    } else if (char === "}") {
      braceDepth = Math.max(braceDepth - 1, 0);
    } else if (
      char === "." &&
      parenDepth === 0 &&
      bracketDepth === 0 &&
      braceDepth === 0 &&
      /[A-Za-z_\]\)]/.test(line[index - 1] ?? "") &&
      /[A-Za-z_]/.test(line[index + 1] ?? "")
    ) {
      dots.push(index);
    }
  }

  return dots;
}

function wrapBinaryOperatorLine(
  line: string,
  indent: number,
  indentText: string,
  printWidth: number,
  logicalOperatorPosition: LogicalOperatorPosition
): string[] | null {
  const operators = findTopLevelBinaryOperatorIndexes(line);
  if (operators.length === 0) {
    return null;
  }

  const baseIndent = spaces(indent, indentText);
  const childIndent = spaces(indent + 1, indentText);
  const parts = splitBinaryExpression(line, operators, logicalOperatorPosition);
  if (parts.length < 2) {
    return null;
  }

  if (line.startsWith("return ") && parts.length > 1) {
    const joinedFirst = `${parts[0]} ${parts[1]}`;
    if (`${baseIndent}${joinedFirst}`.length <= printWidth) {
      parts.splice(0, 2, joinedFirst);
    }
  }

  return parts.flatMap((part, index) => {
    const prefix = index === 0 ? baseIndent : childIndent;
    const wrappedGroup = wrapParenthesizedLogicalOperand(part, prefix, logicalOperatorPosition, indentText);
    return wrappedGroup ?? [`${prefix}${part}`];
  });
}

function splitBinaryExpression(
  line: string,
  operators: Array<{ index: number; operator: string }>,
  logicalOperatorPosition: LogicalOperatorPosition
): string[] {
  if (operators.some((operator) => operator.operator !== "&&" && operator.operator !== "||")) {
    const parts: string[] = [];
    let start = 0;
    for (const operator of operators) {
      const part = line.slice(start, operator.index).trim();
      if (part !== "") {
        parts.push(part);
      }
      start = operator.index;
    }
    const tail = line.slice(start).trim();
    if (tail !== "") {
      parts.push(tail);
    }
    return parts;
  }

  return splitLogicalExpression(line, logicalOperatorPosition);
}

function wrapParenthesizedLogicalOperand(
  part: string,
  prefix: string,
  logicalOperatorPosition: LogicalOperatorPosition,
  indentText: string
): string[] | null {
  const match = /^(&&|\|\|)\s+\(/.exec(part);
  const hasLeadingOperator = match !== null;
  if (!hasLeadingOperator && !part.startsWith("(")) {
    return null;
  }

  const range = findFirstTopLevelParenRange(part);
  if (!range) {
    return null;
  }

  const inner = part.slice(range.open + 1, range.close);
  const innerParts = splitLogicalExpression(inner, logicalOperatorPosition);
  if (innerParts.length < 2) {
    return null;
  }

  const after = part.slice(range.close + 1).trimStart();
  const innerPrefix = `${prefix}${indentText}`;
  const lines = innerParts.map((innerPart, index) => {
    const before = index === 0 ? `${match?.[1] ?? ""}${hasLeadingOperator ? " " : ""}(` : "";
    const suffix = index === innerParts.length - 1 ? `)${formatParenSuffix(after)}` : "";
    return `${index === 0 ? prefix : innerPrefix}${before}${innerPart}${suffix}`;
  });
  return lines;
}

function splitLogicalExpression(source: string, logicalOperatorPosition: LogicalOperatorPosition): string[] {
  const operators = findTopLevelBinaryOperatorIndexes(source).filter((operator) => operator.operator === "&&" || operator.operator === "||");
  if (operators.length === 0) {
    return [source.trim()];
  }

  const parts: string[] = [];
  let start = 0;
  for (let index = 0; index < operators.length; index += 1) {
    const operator = operators[index];
    const part = source.slice(start, operator.index).trim();
    if (part !== "") {
      parts.push(logicalOperatorPosition === "end-of-line" ? `${part} ${operator.operator}` : part);
    }
    start = logicalOperatorPosition === "end-of-line" ? operator.index + operator.operator.length : operator.index;
  }
  const tail = source.slice(start).trim();
  if (tail !== "") {
    parts.push(tail);
  }
  return parts;
}

function findTopLevelBinaryOperatorIndexes(line: string): Array<{ index: number; operator: string }> {
  const operators: Array<{ index: number; operator: string }> = [];
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "'" || char === "\"") {
      const [, nextIndex] = readString(line, index, char);
      index = nextIndex - 1;
      continue;
    }
    if (char === "(") {
      parenDepth += 1;
      continue;
    }
    if (char === ")") {
      parenDepth = Math.max(parenDepth - 1, 0);
      continue;
    }
    if (char === "[") {
      bracketDepth += 1;
      continue;
    }
    if (char === "]") {
      bracketDepth = Math.max(bracketDepth - 1, 0);
      continue;
    }
    if (char === "{") {
      braceDepth += 1;
      continue;
    }
    if (char === "}") {
      braceDepth = Math.max(braceDepth - 1, 0);
      continue;
    }
    if (parenDepth !== 0 || bracketDepth !== 0 || braceDepth !== 0) {
      continue;
    }

    const two = line.slice(index, index + 2);
    if (two === "&&" || two === "||") {
      operators.push({ index, operator: two });
      index += 1;
      continue;
    }
    if (
      (char === "+" || char === "-" || char === "*" || char === "/" || char === "%") &&
      /[A-Za-z0-9_\]\)'"]/.test(previousNonSpaceCharacter(line, index) ?? "") &&
      /[A-Za-z0-9_('"[]/.test(nextNonSpaceCharacter(line, index) ?? "")
    ) {
      operators.push({ index, operator: char });
    }
  }

  return operators;
}

function previousNonSpaceCharacter(value: string, beforeIndex: number): string | undefined {
  for (let index = beforeIndex - 1; index >= 0; index -= 1) {
    if (!/\s/.test(value[index])) {
      return value[index];
    }
  }
  return undefined;
}

function nextNonSpaceCharacter(value: string, afterIndex: number): string | undefined {
  for (let index = afterIndex + 1; index < value.length; index += 1) {
    if (!/\s/.test(value[index])) {
      return value[index];
    }
  }
  return undefined;
}

function splitLeadingAnnotations(line: string, options: IndentOptions): string[] {
  const annotations: string[] = [];
  let index = 0;
  while (line[index] === "@") {
    const [annotation, nextIndex] = readAnnotation(line, index);
    if (annotation === undefined || nextIndex === undefined) {
      break;
    }
    annotations.push(annotation);
    index = nextIndex;
    while (index < line.length && /\s/.test(line[index])) {
      index += 1;
    }
  }

  if (annotations.length === 0) {
    return [line];
  }

  const remainder = line.slice(index).trim();
  if (remainder === "") {
    return annotations;
  }
  if (
    options.salesforceTestVisiblePlacement === "inline" &&
    annotations.length === 1 &&
    /^@TestVisible$/i.test(annotations[0]) &&
    isSimplePropertyLine(remainder)
  ) {
    return [`${annotations[0]} ${remainder}`];
  }
  return [...annotations, remainder];
}

function readAnnotation(source: string, start: number): [string | undefined, number | undefined] {
  if (source[start] !== "@") {
    return [undefined, undefined];
  }
  let cursor = start + 1;
  while (cursor < source.length && /[A-Za-z0-9_.]/.test(source[cursor])) {
    cursor += 1;
  }
  if (cursor === start + 1) {
    return [undefined, undefined];
  }
  while (cursor < source.length && /\s/.test(source[cursor])) {
    cursor += 1;
  }
  if (source[cursor] !== "(") {
    return [source.slice(start, cursor).trim(), cursor];
  }
  let depth = 1;
  cursor += 1;
  while (cursor < source.length && depth > 0) {
    const char = source[cursor];
    if (char === "'" || char === "\"") {
      const [, next] = readString(source, cursor, char);
      cursor = next;
      continue;
    }
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
    }
    cursor += 1;
  }
  return [source.slice(start, cursor).trim(), cursor];
}

function normalizeInlineWhitespace(value: string): string {
  const normalized = normalizeOutsideLiteralsAndComments(value, normalizeCodeWhitespace);
  return normalizeSwitchAndWhenHeaders(
    normalized
    .replace(/\b(if|while)\s*\(([^)]*)\)/g, (_full, keyword: string, expr: string) => `${keyword} (${normalizeHeaderExpression(expr)})`)
    .replace(/\bfor\s*\(([^)]*)\)/g, (_full, inside: string) => {
      if (inside.includes(";")) {
        const parts = inside.split(";");
        if (parts.length === 3) {
          return `for (${normalizeHeaderExpression(parts[0])}; ${normalizeHeaderExpression(parts[1])}; ${normalizeHeaderExpression(parts[2])})`;
        }
        return `for (${normalizeHeaderExpression(inside)})`;
      }
      if (!inside.includes(":")) {
        return `for (${normalizeHeaderExpression(inside)})`;
      }
      const colonIndex = inside.indexOf(":");
      const left = normalizeHeaderExpression(inside.slice(0, colonIndex));
      const right = normalizeHeaderExpression(inside.slice(colonIndex + 1));
      return `for (${left} : ${right})`;
    })
    .replace(/\b(if|for|while|switch|catch)\(/g, "$1 (")
  );
}

function normalizeOutsideLiteralsAndComments(value: string, normalizeSegment: (segment: string) => string): string {
  let out = "";
  let index = 0;
  let codeStart = 0;
  while (index < value.length) {
    const char = value[index];
    const next = value[index + 1];
    if (char === "'" || char === "\"") {
      out += normalizeSegment(value.slice(codeStart, index));
      const [, end] = readString(value, index, char);
      out += value.slice(index, end);
      index = end;
      codeStart = index;
      continue;
    }
    if (char === "/" && next === "/") {
      out += normalizeSegment(value.slice(codeStart, index));
      const lineEnd = value.indexOf("\n", index);
      const end = lineEnd === -1 ? value.length : lineEnd;
      out += value.slice(index, end);
      index = end;
      codeStart = index;
      continue;
    }
    if (char === "/" && next === "*") {
      out += normalizeSegment(value.slice(codeStart, index));
      const blockEnd = value.indexOf("*/", index + 2);
      const end = blockEnd === -1 ? value.length : blockEnd + 2;
      out += value.slice(index, end);
      index = end;
      codeStart = index;
      continue;
    }
    index += 1;
  }
  out += normalizeSegment(value.slice(codeStart));
  return out;
}

function normalizeCodeWhitespace(value: string): string {
  const normalized = value
    .replace(/[ \t]+/g, " ")
    .replace(/\s+\(/g, "(")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\breturn\(/g, "return (")
    .replace(/\s+,/g, ",")
    .replace(/,\s*/g, ", ")
    .replace(/\s*\.\s*/g, ".")
    .replace(/\s*=>\s*/g, " => ")
    .replace(/\s*(==|!=|<=|>=|\|\||&&|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|<<=|>>=|>>>=|\|)\s*/g, " $1 ")
    .replace(/([A-Za-z0-9_\]\)\}])\s*([*\/%])\s*-\s*([A-Za-z0-9_(])/g, "$1 $2 -$3")
    .replace(/(?<=[A-Za-z0-9_'"\]\)\}])\s*([+\-*\/%])\s*(?=[A-Za-z0-9_'"(\[])/g, " $1 ")
    .replace(/([A-Za-z0-9_\]\)\}])\s*=\s*([A-Za-z0-9_'"(\[{])/g, "$1 = $2")
    .replace(/([A-Za-z0-9_\]\)\}])\s*=\s*$/g, "$1 = ")
    .replace(/\s{2,}/g, " ");
  return normalizeGenericTypeWhitespace(normalizeTernaryWhitespace(normalized));
}

function normalizeTernaryWhitespace(value: string): string {
  const ternary = findTopLevelTernary(value);
  if (ternary === null) {
    return value;
  }

  const condition = value.slice(0, ternary.question).trimEnd();
  const whenTrue = value.slice(ternary.question + 1, ternary.colon).trim();
  const whenFalse = value.slice(ternary.colon + 1).trimStart();
  return `${condition} ? ${whenTrue} : ${whenFalse}`;
}

function normalizeHeaderExpression(value: string): string {
  const normalized = value
    .trim()
    .replace(/\s*(==|!=|<=|>=|\|\||&&)\s*/g, " $1 ")
    .replace(/([A-Za-z0-9_\)\]])\s*<\s*([A-Za-z0-9_(\[])/g, "$1 < $2")
    .replace(/([A-Za-z0-9_\)\]])\s*>\s*([A-Za-z0-9_(\[])/g, "$1 > $2")
    .replace(/\s{2,}/g, " ");
  return normalizeGenericTypeWhitespace(normalized);
}

function normalizeGenericTypeWhitespace(value: string): string {
  return value
    .replace(/\b(List|Set)\s*<\s*([A-Za-z_][A-Za-z0-9_.]*)\s*>/g, "$1<$2>")
    .replace(/\bMap\s*<\s*([A-Za-z_][A-Za-z0-9_.]*)\s*,\s*([A-Za-z_][A-Za-z0-9_.]*)\s*>/g, "Map<$1, $2>");
}

function normalizeSwitchAndWhenHeaders(value: string): string {
  return value
    .replace(/\bswitch\s+on\s*/g, "switch on ")
    .replace(/\bwhen\s+else\s*(?=\{)/g, "when else ")
    .replace(/\bwhen\s+([^{}]+?)\s*(?=\{)/g, (_full, clause: string) => `when ${normalizeWhenClause(clause)} `);
}

function normalizeWhenClause(value: string): string {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .join(", ");
}

function compactBlankLines(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    if (line.trim() === "" && out.at(-1)?.trim() === "") {
      continue;
    }
    out.push(line);
  }
  return out;
}

function spaceApexMembers(lines: string[]): string[] {
  const out: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const previous = previousNonBlank(out);
    if (
      previous !== undefined &&
      out.at(-1)?.trim() !== "" &&
      previous.line.trim() !== "" &&
      ((terminatesApexMember(previous.line) && startsApexMember(lines, index)) || startsApexDocAfterCode(previous.line, line)) &&
      indentationWidth(previous.line) === indentationWidth(line)
    ) {
      out.push("");
    }
    out.push(line);
  }
  return out;
}

function previousNonBlank(lines: string[]): { line: string; index: number } | undefined {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index].trim() !== "") {
      return { line: lines[index], index };
    }
  }
  return undefined;
}

function terminatesApexMember(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === "}" || isSimplePropertyLine(trimmed);
}

function startsApexDocAfterCode(previousLine: string, line: string): boolean {
  const previous = previousLine.trim();
  const current = line.trim();
  return (
    current.startsWith("/*") &&
    previous.endsWith(";") &&
    !previous.startsWith("/*") &&
    !previous.startsWith("*") &&
    !previous.startsWith("//") &&
    !previous.startsWith("@")
  );
}

function isBlockCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.endsWith("*/");
}

function startsApexMember(lines: string[], index: number): boolean {
  const line = lines[index];
  const trimmed = line.trim();
  if (trimmed === "" || trimmed === "}") {
    return false;
  }
  if (trimmed.startsWith("@") || trimmed.startsWith("/**")) {
    return true;
  }
  if (isApexMemberDeclarationStart(trimmed)) {
    return true;
  }
  if (!trimmed.startsWith("//")) {
    return false;
  }

  const indent = indentationWidth(line);
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    const candidate = lines[cursor];
    const candidateTrimmed = candidate.trim();
    if (candidateTrimmed === "") {
      continue;
    }
    if (indentationWidth(candidate) !== indent) {
      return false;
    }
    if (candidateTrimmed.startsWith("//")) {
      continue;
    }
    return candidateTrimmed.startsWith("@") || candidateTrimmed.startsWith("/**") || isApexMemberDeclarationStart(candidateTrimmed);
  }
  return false;
}

function isSimplePropertyLine(line: string): boolean {
  return /\{\s+(?:(?:(?:public|private|protected|global)\s+)?(?:get|set);\s+){1,2}\}$/.test(line);
}

function isApexMemberDeclarationStart(line: string): boolean {
  return /^(?:public|private|protected|global|testMethod|webservice)\b/.test(line);
}

function indentationWidth(line: string): number {
  const match = /^(\s*)/.exec(line);
  return match?.[1].length ?? 0;
}

function spaces(indent: number, indentText: string): string {
  return indentText.repeat(indent);
}

function indentUnit(options: IndentOptions): string {
  if (options.useTabs === true) {
    return "\t";
  }
  const tabWidth = typeof options.tabWidth === "number" && Number.isFinite(options.tabWidth) && options.tabWidth > 0 ? options.tabWidth : 2;
  return " ".repeat(Math.trunc(tabWidth));
}

function resolvePrintWidth(options: IndentOptions): number {
  if (typeof options.printWidth === "number" && Number.isFinite(options.printWidth) && options.printWidth > 0) {
    return Math.trunc(options.printWidth);
  }
  return 80;
}

function resolveLogicalOperatorPosition(options: IndentOptions): LogicalOperatorPosition {
  return options.salesforceLogicalOperatorPosition === "start-of-line" ? "start-of-line" : "end-of-line";
}

function readJoinKeyword(source: string, index: number, trimEnd: number): [string | undefined, number | undefined] {
  const scoped = source.slice(index, trimEnd);
  const rest = scoped.trimStart();
  const consumedWhitespace = scoped.length - rest.length;
  const start = index + consumedWhitespace;
  if (consumedWhitespace > 0) {
    index = start;
  }
  for (const keyword of ["else", "catch", "finally"]) {
    if (source.startsWith(keyword, index) && isKeywordBoundary(source, index + keyword.length)) {
      return [keyword, index + keyword.length];
    }
  }
  if (source.startsWith("while", index) && isKeywordBoundary(source, index + "while".length)) {
    const keywordEnd = index + "while".length;
    let cursor = skipWhitespaceAndComments(source, keywordEnd, trimEnd);
    if (source[cursor] === "(") {
      let depth = 1;
      cursor += 1;
      while (cursor < trimEnd && depth > 0) {
        const char = source[cursor];
        const next = source[cursor + 1];
        if (char === "'" || char === "\"") {
          const [, nextIndex] = readString(source, cursor, char);
          cursor = nextIndex;
          continue;
        }
        if (char === "/" && next === "/") {
          const lineEnd = source.indexOf("\n", cursor + 2);
          cursor = lineEnd === -1 ? trimEnd : lineEnd + 1;
          continue;
        }
        if (char === "/" && next === "*") {
          const blockEnd = source.indexOf("*/", cursor + 2);
          cursor = blockEnd === -1 ? trimEnd : blockEnd + 2;
          continue;
        }
        if (char === "(") {
          depth += 1;
        } else if (char === ")") {
          depth -= 1;
        }
        cursor += 1;
      }
      cursor = skipWhitespaceAndComments(source, cursor, trimEnd);
      if (depth === 0 && source[cursor] === ";") {
        return ["while", keywordEnd];
      }
    }
  }
  return [undefined, undefined];
}

function skipWhitespaceAndComments(source: string, start: number, trimEnd: number): number {
  let cursor = start;
  while (cursor < trimEnd) {
    while (cursor < trimEnd && /\s/.test(source[cursor])) {
      cursor += 1;
    }
    const next = source[cursor + 1];
    if (source[cursor] === "/" && next === "/") {
      const lineEnd = source.indexOf("\n", cursor + 2);
      cursor = lineEnd === -1 ? trimEnd : lineEnd + 1;
      continue;
    }
    if (source[cursor] === "/" && next === "*") {
      const blockEnd = source.indexOf("*/", cursor + 2);
      cursor = blockEnd === -1 ? trimEnd : blockEnd + 2;
      continue;
    }
    break;
  }
  return cursor;
}

function isKeywordBoundary(source: string, index: number): boolean {
  const char = source[index];
  return char === undefined || !/[A-Za-z0-9_]/.test(char);
}

function isJoinBlockedByTrivia(previousLine: string): boolean {
  const trimmed = previousLine.trim();
  if (trimmed.startsWith("//")) {
    return true;
  }
  if (trimmed.includes("//")) {
    return true;
  }
  if (trimmed.startsWith("/*") || trimmed.endsWith("*/")) {
    return true;
  }
  return /^\*[^/]/.test(trimmed);
}

function pairDelimiterRanges(tokens: ApexToken[], openKind: "open-paren", closeKind: "close-paren"): Array<[number, number]> {
  const stack: number[] = [];
  const ranges: Array<[number, number]> = [];
  for (const token of tokens) {
    if (token.kind === openKind) {
      stack.push(token.range.start.offset);
      continue;
    }
    if (token.kind === closeKind) {
      const openOffset = stack.pop();
      if (openOffset !== undefined) {
        ranges.push([openOffset, token.range.end.offset]);
      }
    }
  }
  return ranges;
}

function isOffsetWithinAnyRange(offset: number, ranges: Array<[number, number]>): boolean {
  for (const [start, end] of ranges) {
    if (offset >= start && offset < end) {
      return true;
    }
  }
  return false;
}
