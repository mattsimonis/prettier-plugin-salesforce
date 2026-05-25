import type { AstPath, Doc, Printer } from "prettier";
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
};

export function formatApexSource(document: ApexDocument | string, options: IndentOptions = {}): string {
  const indentText = indentUnit(options);
  if (typeof document !== "string") {
    const fromNodes = formatApexSourceFromNodes(document, indentText);
    if (fromNodes !== undefined) {
      return fromNodes;
    }
  }

  const source = typeof document === "string" ? document : document.source;
  const tokens = typeof document === "string" ? [] : document.tokens;
  const breakableSemicolonOffsets =
    typeof document === "string" ? undefined : collectBreakableSemicolonOffsets(document.root.children, source, 0, source.length);
  return formatApexSlice(source, tokens, findTrimStart(source), findTrimEnd(source), breakableSemicolonOffsets, indentText);
}

function formatApexSlice(
  source: string,
  tokens: ApexToken[],
  sliceStart: number,
  sliceEnd: number,
  breakableSemicolonOffsets?: Set<number>,
  indentText = "  "
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
      flushLine(lines, current, indent, indentText);
      current = "";
      const stop = Math.min(comment.range.end.offset, trimEnd);
      lines.push(`${spaces(indent, indentText)}${source.slice(index, stop).trimEnd()}`);
      index = stop;
      continue;
    }

    if (comment?.kind === "block-comment") {
      flushLine(lines, current, indent, indentText);
      current = "";
      const stop = Math.min(comment.range.end.offset, trimEnd);
      for (const line of source.slice(index, stop).split(/\r\n?|\n/)) {
        lines.push(`${spaces(indent, indentText)}${line.trim()}`);
      }
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
      current = `${current.trimEnd()} {`;
      flushLine(lines, current, indent, indentText);
      current = "";
      indent += 1;
      justClosedBlock = false;
      index += 1;
      continue;
    }

    if (char === "}") {
      flushLine(lines, current, indent, indentText);
      current = "";
      indent = Math.max(indent - 1, 0);
      lines.push(`${spaces(indent, indentText)}}`);
      justClosedBlock = true;
      index += 1;
      continue;
    }

    if (char === ";" && !isOffsetWithinAnyRange(index, parenRanges)) {
      current = `${current.trimEnd()};`;
      flushLine(lines, current, indent, indentText);
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

    if (!/\s/.test(char)) {
      justClosedBlock = false;
    }
    current += /\s/.test(char) ? " " : char;
    index += 1;
  }

  flushLine(lines, current, indent, indentText);
  return compactBlankLines(lines).join("\n") + "\n";
}

function formatApexSourceFromNodes(document: ApexDocument, indentText: string): string | undefined {
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
    chunks.push(formatApexSlice(document.source, document.tokens, start, end, breakableSemicolonOffsets, indentText).trimEnd());
  }
  if (chunks.length === 0) {
    return undefined;
  }
  return `${chunks.join("\n\n")}\n`;
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

function flushLine(lines: string[], line: string, indent: number, indentText: string): void {
  const trimmed = normalizeInlineWhitespace(line).trim();
  if (trimmed !== "") {
    for (const chunk of splitLeadingAnnotations(trimmed)) {
      lines.push(`${spaces(indent, indentText)}${chunk}`);
    }
  }
}

function splitLeadingAnnotations(line: string): string[] {
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
  return value
    .replace(/[ \t]+/g, " ")
    .replace(/\s+\(/g, "(")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+,/g, ",")
    .replace(/,\s*/g, ", ")
    .replace(/\s*(==|!=|<=|>=|\|\||&&|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|<<=|>>=|>>>=|\|)\s*/g, " $1 ")
    .replace(/(?<=[A-Za-z0-9_\]\)\}])\s*([+\-*\/%])\s*(?=[A-Za-z0-9_'"(\[])/g, " $1 ")
    .replace(/([A-Za-z0-9_\]\)\}])\s*=\s*([A-Za-z0-9_'"(\[{])/g, "$1 = $2")
    .replace(/([A-Za-z0-9_\]\)\}])\s*=\s*$/g, "$1 = ")
    .replace(/\s{2,}/g, " ");
}

function normalizeHeaderExpression(value: string): string {
  return value
    .trim()
    .replace(/\s*(==|!=|<=|>=|\|\||&&)\s*/g, " $1 ")
    .replace(/([A-Za-z0-9_\)\]])\s*<\s*([A-Za-z0-9_(\[])/g, "$1 < $2")
    .replace(/([A-Za-z0-9_\)\]])\s*>\s*([A-Za-z0-9_(\[])/g, "$1 > $2")
    .replace(/\s{2,}/g, " ");
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
