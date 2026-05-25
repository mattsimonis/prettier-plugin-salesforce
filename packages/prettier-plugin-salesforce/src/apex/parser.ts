import type { Parser } from "prettier";
import type { ApexComment, ApexDiagnostic, ApexDocument, ApexNode, ApexPosition, ApexRange, ApexStatementKind, ApexToken } from "./ast.js";

export type ApexParserOptions = {
  anonymous?: boolean;
};

export function parseApex(source: string, options: ApexParserOptions = {}): ApexDocument {
  const structuralTokens = scanStructuralTokens(source);
  const tokens = collectTokens(source, structuralTokens);
  const comments = collectComments(source);
  const anonymous = options.anonymous === true;
  const root: ApexNode = {
    kind: "source_file",
    range: rangeFor(source, 0, source.length),
    children: collectTopLevelNodes(source, anonymous)
  };

  return {
    kind: "apex-document",
    mode: anonymous ? "anonymous" : "class-or-trigger",
    source,
    root,
    tokens,
    comments,
    diagnostics: collectDiagnostics(source)
  };
}

export const apexParser: Parser<ApexDocument> = {
  astFormat: "salesforce-apex-cst",
  parse: (source) => parseApex(source, { anonymous: false }),
  locStart: (node) => node.root.range.start.offset,
  locEnd: (node) => node.root.range.end.offset
};

export const anonymousApexParser: Parser<ApexDocument> = {
  astFormat: "salesforce-apex-cst",
  parse: (source) => parseApex(source, { anonymous: true }),
  locStart: (node) => node.root.range.start.offset,
  locEnd: (node) => node.root.range.end.offset
};

function collectTopLevelNodes(source: string, anonymous: boolean): ApexNode[] {
  const bracePairs = pairDelimiterOffsets(scanStructuralTokens(source), "open-brace", "close-brace");
  if (anonymous) {
    return collectTopLevelStatementBlockNodes(source, bracePairs);
  }
  const declarationNodes = collectTopLevelDeclarationNodes(source, bracePairs);

  if (declarationNodes.length > 0) {
    return declarationNodes;
  }

  if (source.trim() === "") {
    return [];
  }

  const first = source.search(/\S/);
  const start = Math.max(first, 0);
  const end = source.trimEnd().length;
  return [
    {
      kind: "statement_block",
      text: source.slice(start, end),
      range: rangeFor(source, start, end),
      children: collectStatementBlockChildren(source, bracePairs, start, end)
    }
  ];
}

function collectTopLevelStatementBlockNodes(source: string, bracePairs: Array<[number, number]>): ApexNode[] {
  if (source.trim() === "") {
    return [];
  }
  const first = source.search(/\S/);
  const start = Math.max(first, 0);
  const end = source.trimEnd().length;
  return [
    {
      kind: "statement_block",
      text: source.slice(start, end),
      range: rangeFor(source, start, end),
      children: collectStatementBlockChildren(source, bracePairs, start, end)
    }
  ];
}

function collectStatementBlockChildren(source: string, bracePairs: Array<[number, number]>, start: number, end: number): ApexNode[] {
  const nodes: ApexNode[] = [];
  nodes.push(...collectBlockSpanNodes(source, bracePairs, start, end));
  nodes.push(...collectTopLevelStatementSpanNodes(source, start, end));
  nodes.sort((a, b) => a.range.start.offset - b.range.start.offset);
  return nodes;
}

function collectTopLevelDeclarationNodes(source: string, bracePairs: Array<[number, number]>): ApexNode[] {
  const nodes: ApexNode[] = [];
  const pattern = /\b(?:(class|interface|enum)\s+([A-Za-z_][A-Za-z0-9_]*)|(trigger)\s+([A-Za-z_][A-Za-z0-9_]*)\s+on\s+([A-Za-z_][A-Za-z0-9_]*))/gi;

  for (const match of source.matchAll(pattern)) {
    const full = match[0];
    const index = match.index;
    if (index === undefined || !isTopLevelOffset(index, bracePairs)) {
      continue;
    }

    const declarationStart = findDeclarationStart(source, index);
    const openOffset = source.indexOf("{", index + full.length);
    const matchingPair = bracePairs.find(([open]) => open === openOffset);
    if (openOffset === -1 || matchingPair === undefined) {
      continue;
    }

    const closeEnd = matchingPair[1] + 1;
    const kindToken = match[1] ?? match[3] ?? "declaration";
    const nameToken = match[2] ?? match[4] ?? "";
    nodes.push({
      kind: `${kindToken.toLowerCase()}_declaration`,
      name: nameToken,
      text: source.slice(declarationStart, closeEnd),
      range: rangeFor(source, declarationStart, closeEnd),
      children: collectDeclarationChildren(source, bracePairs, declarationStart, closeEnd, matchingPair[0], matchingPair[1])
    });
  }

  nodes.sort((a, b) => a.range.start.offset - b.range.start.offset);
  return nodes;
}

function collectDeclarationChildren(
  source: string,
  bracePairs: Array<[number, number]>,
  declarationStart: number,
  declarationEnd: number,
  declarationOpenBrace: number,
  declarationCloseBrace: number
): ApexNode[] {
  const children: ApexNode[] = [];
  children.push(...collectBlockSpanNodes(source, bracePairs, declarationStart, declarationEnd));
  children.push(...collectDeclarationBodyStatementNodes(source, declarationOpenBrace, declarationCloseBrace));
  children.push(...collectInnerTypeDeclarationNodes(source, bracePairs, declarationOpenBrace, declarationCloseBrace));
  children.push(...collectMethodDeclarationNodes(source, bracePairs, declarationOpenBrace, declarationCloseBrace));
  children.sort((a, b) => a.range.start.offset - b.range.start.offset);
  return children;
}

function collectDeclarationBodyStatementNodes(source: string, declarationOpenBrace: number, declarationCloseBrace: number): ApexNode[] {
  const nodes: ApexNode[] = [];
  let depth = 0;
  let parenDepth = 0;
  let statementStart = declarationOpenBrace + 1;
  let index = declarationOpenBrace + 1;

  while (index < declarationCloseBrace) {
    const char = source[index];
    const next = source[index + 1];

    if (char === "'" || char === "\"") {
      index = scanQuotedLiteral(source, index, char);
      continue;
    }
    if (char === "[" && isBracketedQueryStart(source, index)) {
      index = scanBracketedExpression(source, index);
      continue;
    }
    if (char === "/" && next === "/") {
      const lineEnd = source.indexOf("\n", index);
      const nextIndex = lineEnd === -1 ? declarationCloseBrace : lineEnd + 1;
      if (depth === 0 && parenDepth === 0 && isOnlyWhitespace(source, statementStart, index)) {
        statementStart = nextIndex;
      }
      index = nextIndex;
      continue;
    }
    if (char === "/" && next === "*") {
      const blockEnd = source.indexOf("*/", index + 2);
      const nextIndex = blockEnd === -1 ? declarationCloseBrace : blockEnd + 2;
      if (depth === 0 && parenDepth === 0 && isOnlyWhitespace(source, statementStart, index)) {
        statementStart = nextIndex;
      }
      index = nextIndex;
      continue;
    }

    if (char === "{") {
      depth += 1;
      index += 1;
      continue;
    }
    if (char === "}") {
      if (depth > 0) {
        depth -= 1;
      }
      statementStart = index + 1;
      index += 1;
      continue;
    }
    if (char === "(") {
      parenDepth += 1;
      index += 1;
      continue;
    }
    if (char === ")") {
      parenDepth = Math.max(parenDepth - 1, 0);
      index += 1;
      continue;
    }

    if (depth === 0 && parenDepth === 0 && (char === ";" || char === ",")) {
      addStatementSpanNode(source, nodes, statementStart, index + 1);
      statementStart = index + 1;
    }
    index += 1;
  }

  return nodes;
}

function collectInnerTypeDeclarationNodes(
  source: string,
  bracePairs: Array<[number, number]>,
  declarationOpenBrace: number,
  declarationCloseBrace: number
): ApexNode[] {
  const nodes: ApexNode[] = [];
  const pattern = /\b(class|interface|enum)\s+([A-Za-z_][A-Za-z0-9_]*)/gi;

  for (const match of source.matchAll(pattern)) {
    const keyword = match[1];
    const name = match[2];
    const index = match.index;
    if (index === undefined) {
      continue;
    }
    if (index <= declarationOpenBrace || index >= declarationCloseBrace) {
      continue;
    }
    if (!isTopLevelOffsetWithinDeclaration(index, bracePairs, declarationOpenBrace, declarationCloseBrace)) {
      continue;
    }

    const declarationStart = findDeclarationStart(source, index);
    const openOffset = source.indexOf("{", index + match[0].length);
    const matchingPair = bracePairs.find(([open]) => open === openOffset);
    if (openOffset === -1 || matchingPair === undefined) {
      continue;
    }
    if (matchingPair[1] >= declarationCloseBrace) {
      continue;
    }

    const declarationEnd = matchingPair[1] + 1;
    nodes.push({
      kind: `${keyword.toLowerCase()}_declaration`,
      name,
      text: source.slice(declarationStart, declarationEnd),
      range: rangeFor(source, declarationStart, declarationEnd),
      children: collectDeclarationChildren(source, bracePairs, declarationStart, declarationEnd, matchingPair[0], matchingPair[1])
    });
  }

  return nodes;
}

function collectMethodDeclarationNodes(
  source: string,
  bracePairs: Array<[number, number]>,
  declarationOpenBrace: number,
  declarationCloseBrace: number
): ApexNode[] {
  const methods: ApexNode[] = [];
  for (const [open, close] of bracePairs) {
    if (open <= declarationOpenBrace || close >= declarationCloseBrace) {
      continue;
    }
    if (!isTopLevelOffsetWithinDeclaration(open, bracePairs, declarationOpenBrace, declarationCloseBrace)) {
      continue;
    }

    const headerStart = findMethodHeaderStart(source, open, declarationOpenBrace + 1);
    const header = source.slice(headerStart, open);
    if (!isMethodHeaderCandidate(header)) {
      continue;
    }

    const statementChildren = collectStatementSpanNodes(source, open, close);
    methods.push({
      kind: "method_declaration",
      name: extractMethodName(header),
      text: source.slice(headerStart, close + 1),
      range: rangeFor(source, headerStart, close + 1),
      children: statementChildren
    });
  }
  methods.push(...collectAccessorDeclarationNodes(source, bracePairs, declarationOpenBrace, declarationCloseBrace));
  return methods;
}

function collectAccessorDeclarationNodes(
  source: string,
  bracePairs: Array<[number, number]>,
  declarationOpenBrace: number,
  declarationCloseBrace: number
): ApexNode[] {
  const accessors: ApexNode[] = [];
  for (const [open, close] of bracePairs) {
    if (open <= declarationOpenBrace || close >= declarationCloseBrace) {
      continue;
    }
    const headerStart = findMethodHeaderStart(source, open, declarationOpenBrace + 1);
    const header = source.slice(headerStart, open).trim();
    if (!isAccessorHeaderCandidate(header)) {
      continue;
    }
    const parent = findNearestParentBracePair(open, close, bracePairs, declarationOpenBrace, declarationCloseBrace);
    if (parent === undefined) {
      continue;
    }
    if (!isTopLevelOffsetWithinDeclaration(parent[0], bracePairs, declarationOpenBrace, declarationCloseBrace)) {
      continue;
    }
    const statementChildren = collectStatementSpanNodes(source, open, close);
    accessors.push({
      kind: "method_declaration",
      name: extractMethodName(header),
      text: source.slice(headerStart, close + 1),
      range: rangeFor(source, headerStart, close + 1),
      children: statementChildren
    });
  }
  return accessors;
}

function findNearestParentBracePair(
  open: number,
  close: number,
  bracePairs: Array<[number, number]>,
  declarationOpenBrace: number,
  declarationCloseBrace: number
): [number, number] | undefined {
  let parent: [number, number] | undefined;
  for (const pair of bracePairs) {
    const [candidateOpen, candidateClose] = pair;
    if (candidateOpen <= declarationOpenBrace || candidateClose >= declarationCloseBrace) {
      continue;
    }
    if (candidateOpen >= open || candidateClose <= close) {
      continue;
    }
    if (parent === undefined || candidateOpen > parent[0]) {
      parent = pair;
    }
  }
  return parent;
}

function collectStatementSpanNodes(source: string, methodOpenBrace: number, methodCloseBrace: number): ApexNode[] {
  const nodes: ApexNode[] = [];
  let depth = 0;
  let parenDepth = 0;
  let statementStart = methodOpenBrace + 1;
  let index = methodOpenBrace + 1;

  while (index < methodCloseBrace) {
    const char = source[index];
    const next = source[index + 1];

    if (char === "'" || char === "\"") {
      index = scanQuotedLiteral(source, index, char);
      continue;
    }
    if (char === "[" && isBracketedQueryStart(source, index)) {
      index = scanBracketedExpression(source, index);
      continue;
    }
    if (char === "/" && next === "/") {
      const lineEnd = source.indexOf("\n", index);
      const nextIndex = lineEnd === -1 ? methodCloseBrace : lineEnd + 1;
      if (depth === 0 && parenDepth === 0 && isOnlyWhitespace(source, statementStart, index)) {
        statementStart = nextIndex;
      }
      index = nextIndex;
      continue;
    }
    if (char === "/" && next === "*") {
      const blockEnd = source.indexOf("*/", index + 2);
      const nextIndex = blockEnd === -1 ? methodCloseBrace : blockEnd + 2;
      if (depth === 0 && parenDepth === 0 && isOnlyWhitespace(source, statementStart, index)) {
        statementStart = nextIndex;
      }
      index = nextIndex;
      continue;
    }

    if (char === "{") {
      if (parenDepth === 0) {
        const controlStart =
          depth === 0 ? statementStart : findNestedControlStart(source, statementStart, index, methodOpenBrace + 1);
        const addedControl = addControlStatementSpanNode(source, nodes, controlStart, index);
        if (depth === 0 && addedControl) {
          statementStart = index + 1;
        }
      }
      depth += 1;
      index += 1;
      continue;
    }
    if (char === "}") {
      if (depth === 0) {
        addStatementSpanNode(source, nodes, statementStart, index);
        break;
      }
      depth = Math.max(depth - 1, 0);
      if (depth === 0) {
        statementStart = index + 1;
      }
      index += 1;
      continue;
    }
    if (char === "(") {
      parenDepth += 1;
      index += 1;
      continue;
    }
    if (char === ")") {
      parenDepth = Math.max(parenDepth - 1, 0);
      index += 1;
      continue;
    }

    if (char === ";" && depth === 0 && parenDepth === 0) {
      addStatementSpanNode(source, nodes, statementStart, index + 1);
      statementStart = index + 1;
    }
    index += 1;
  }

  return nodes;
}

function collectTopLevelStatementSpanNodes(source: string, start: number, end: number): ApexNode[] {
  const nodes: ApexNode[] = [];
  let depth = 0;
  let parenDepth = 0;
  let statementStart = start;
  let index = start;

  while (index < end) {
    const char = source[index];
    const next = source[index + 1];

    if (char === "'" || char === "\"") {
      index = scanQuotedLiteral(source, index, char);
      continue;
    }
    if (char === "[" && isBracketedQueryStart(source, index)) {
      index = scanBracketedExpression(source, index);
      continue;
    }
    if (char === "/" && next === "/") {
      const lineEnd = source.indexOf("\n", index);
      const nextIndex = lineEnd === -1 ? end : lineEnd + 1;
      if (depth === 0 && statementStart < nextIndex) {
        statementStart = nextIndex;
      }
      index = nextIndex;
      continue;
    }
    if (char === "/" && next === "*") {
      const blockEnd = source.indexOf("*/", index + 2);
      const nextIndex = blockEnd === -1 ? end : blockEnd + 2;
      if (depth === 0 && statementStart < nextIndex) {
        statementStart = nextIndex;
      }
      index = nextIndex;
      continue;
    }

    if (char === "{") {
      if (parenDepth === 0) {
        const controlStart = depth === 0 ? statementStart : findNestedControlStart(source, statementStart, index, start);
        const addedControl = addControlStatementSpanNode(source, nodes, controlStart, index);
        if (depth === 0 && addedControl) {
          statementStart = index + 1;
        }
      }
      depth += 1;
      index += 1;
      continue;
    }
    if (char === "}") {
      if (depth > 0) {
        depth = Math.max(depth - 1, 0);
        if (depth === 0) {
          statementStart = index + 1;
        }
      }
      index += 1;
      continue;
    }
    if (char === "(") {
      parenDepth += 1;
      index += 1;
      continue;
    }
    if (char === ")") {
      parenDepth = Math.max(parenDepth - 1, 0);
      index += 1;
      continue;
    }

    if (char === ";" && depth === 0 && parenDepth === 0) {
      addStatementSpanNode(source, nodes, statementStart, index + 1);
      statementStart = index + 1;
    }
    index += 1;
  }

  return nodes;
}

function findNestedControlStart(source: string, fallbackStart: number, openBraceOffset: number, floorStart: number): number {
  for (let cursor = openBraceOffset - 1; cursor >= floorStart; cursor -= 1) {
    const char = source[cursor];
    if (char === ";" || char === "{" || char === "}") {
      return cursor + 1;
    }
  }
  return fallbackStart;
}

function addControlStatementSpanNode(source: string, nodes: ApexNode[], start: number, openBraceOffset: number): boolean {
  const trimmedStart = trimStartOffset(source, start, openBraceOffset);
  const trimmedEnd = trimEndOffset(source, trimmedStart, openBraceOffset);
  if (trimmedEnd <= trimmedStart) {
    return false;
  }

  const statementKind = classifyControlStatementHeader(source.slice(trimmedStart, trimmedEnd));
  if (statementKind === undefined) {
    return false;
  }

  nodes.push({
    kind: "statement_span",
    statementKind,
    text: source.slice(trimmedStart, openBraceOffset + 1),
    range: rangeFor(source, trimmedStart, openBraceOffset + 1),
    children: []
  });
  return true;
}

function classifyControlStatementHeader(text: string): ApexStatementKind | undefined {
  const trimmed = text.trim();
  if (/^if\b/i.test(trimmed)) {
    return "if-block";
  }
  if (/^for\b/i.test(trimmed)) {
    return "for-block";
  }
  if (/^while\b/i.test(trimmed)) {
    return "while-block";
  }
  if (/^do\b/i.test(trimmed)) {
    return "do-block";
  }
  if (/^switch\b/i.test(trimmed)) {
    return "switch-block";
  }
  if (/^when\b/i.test(trimmed)) {
    return "when-block";
  }
  if (/^try\b/i.test(trimmed)) {
    return "try-block";
  }
  if (/^catch\b/i.test(trimmed)) {
    return "catch-block";
  }
  if (/^finally\b/i.test(trimmed)) {
    return "finally-block";
  }
  return undefined;
}

function addStatementSpanNode(source: string, nodes: ApexNode[], start: number, end: number): void {
  const trimmedStart = normalizeStatementStartOffset(source, start, end);
  const trimmedEnd = trimEndOffset(source, trimmedStart, end);
  if (trimmedEnd <= trimmedStart) {
    return;
  }
  const text = source.slice(trimmedStart, trimmedEnd);
  nodes.push({
    kind: "statement_span",
    statementKind: classifyStatementSpan(text),
    text,
    range: rangeFor(source, trimmedStart, trimmedEnd),
    children: []
  });
}

function classifyStatementSpan(text: string): ApexStatementKind {
  const trimmed = text.trim();
  if (trimmed.startsWith("return ")) {
    return "return";
  }
  if (trimmed === "return;") {
    return "return";
  }
  if (/^(insert|update|delete|upsert|merge|undelete)\s*\(/i.test(trimmed)) {
    return "dml-call";
  }
  if (/^(insert|update|delete|upsert|merge|undelete)\b/i.test(trimmed)) {
    return "dml";
  }
  if (/^\[[\s\S]*\]\s*;?$/.test(trimmed) && /\bselect\b/i.test(trimmed)) {
    return "soql";
  }
  if (/^\[[\s\S]*\]\s*;?$/.test(trimmed) && /\bfind\b/i.test(trimmed)) {
    return "sosl";
  }
  if (trimmed.startsWith("throw ")) {
    return "throw";
  }
  if (trimmed === "break;") {
    return "break";
  }
  if (trimmed === "continue;") {
    return "continue";
  }
  if (/^(final\s+)?[A-Za-z_][A-Za-z0-9_<>,\[\]? ]*\s+[A-Za-z_][A-Za-z0-9_]*\s*=/.test(trimmed)) {
    return "declaration";
  }
  if (/^[A-Za-z_][A-Za-z0-9_<>,\[\]? ]*\s+[A-Za-z_][A-Za-z0-9_]*\s*\([^;{}]*\)\s*;$/.test(trimmed)) {
    return "declaration";
  }
  if (/\b(Database\.)?query\s*\(/i.test(trimmed) || /\bsearch\s*\.\s*query\s*\(/i.test(trimmed)) {
    return "query-call";
  }
  if (isAssignmentUpdate(trimmed)) {
    return "assignment-update";
  }
  if (isSimpleAssignment(trimmed)) {
    return "assignment";
  }
  if (
    /^[A-Z][A-Za-z0-9_]*(?:\s*\([^;{}]*\))?\s*[,;]$/.test(trimmed) &&
    !/^(return|break|continue|throw)$/i.test(trimmed.slice(0, -1).trim())
  ) {
    return "enum-constant";
  }
  if (/\)\s*\./.test(trimmed) || /\b[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*\)\s*\./.test(trimmed)) {
    return "chained-call";
  }
  if (/\b[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(trimmed) || /\)\s*\./.test(trimmed)) {
    return "plain-call";
  }
  return "unknown";
}

function isAssignmentUpdate(text: string): boolean {
  if (/\+\+|--/.test(text)) {
    return true;
  }
  return /(\+=|-=|\*=|\/=|%=|&=|\|=|\^=|>>=|<<=|>>>=)/.test(text);
}

function isSimpleAssignment(text: string): boolean {
  if (/(==|!=|<=|>=)/.test(text)) {
    return false;
  }
  return /(^|[^!<>=])=([^=]|$)/.test(text);
}

function trimStartOffset(source: string, start: number, end: number): number {
  let index = start;
  while (index < end && /\s/.test(source[index])) {
    index += 1;
  }
  return index;
}

function normalizeStatementStartOffset(source: string, start: number, end: number): number {
  let index = trimStartOffset(source, start, end);

  while (index < end) {
    if (source[index] === "/" && source[index + 1] === "/") {
      const lineEnd = source.indexOf("\n", index);
      index = lineEnd === -1 ? end : lineEnd + 1;
      index = trimStartOffset(source, index, end);
      continue;
    }

    if (source[index] === "/" && source[index + 1] === "*") {
      const blockEnd = source.indexOf("*/", index + 2);
      index = blockEnd === -1 ? end : blockEnd + 2;
      index = trimStartOffset(source, index, end);
      continue;
    }

    if (source[index] === "@") {
      const next = scanAnnotation(source, index, end);
      if (next <= index) {
        break;
      }
      index = trimStartOffset(source, next, end);
      continue;
    }

    break;
  }

  return index;
}

function scanAnnotation(source: string, start: number, end: number): number {
  let index = start + 1;

  while (index < end && /[A-Za-z0-9_.]/.test(source[index])) {
    index += 1;
  }

  if (index === start + 1) {
    return start;
  }

  while (index < end && /\s/.test(source[index])) {
    index += 1;
  }

  if (source[index] !== "(") {
    return index;
  }

  let depth = 0;
  while (index < end) {
    const char = source[index];
    const next = source[index + 1];
    if (char === "'" || char === "\"") {
      index = scanQuotedLiteral(source, index, char);
      continue;
    }
    if (char === "/" && next === "/") {
      const lineEnd = source.indexOf("\n", index);
      index = lineEnd === -1 ? end : lineEnd + 1;
      continue;
    }
    if (char === "/" && next === "*") {
      const blockEnd = source.indexOf("*/", index + 2);
      index = blockEnd === -1 ? end : blockEnd + 2;
      continue;
    }
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return index + 1;
      }
    }
    index += 1;
  }

  return end;
}

function trimEndOffset(source: string, start: number, end: number): number {
  let index = end;
  while (index > start && /\s/.test(source[index - 1])) {
    index -= 1;
  }
  return index;
}

function isOnlyWhitespace(source: string, start: number, end: number): boolean {
  for (let index = start; index < end; index += 1) {
    if (!/\s/.test(source[index])) {
      return false;
    }
  }
  return true;
}

function isTopLevelOffsetWithinDeclaration(
  offset: number,
  bracePairs: Array<[number, number]>,
  declarationOpenBrace: number,
  declarationCloseBrace: number
): boolean {
  for (const [open, close] of bracePairs) {
    if (open <= declarationOpenBrace || close >= declarationCloseBrace) {
      continue;
    }
    if (offset > open && offset <= close) {
      return false;
    }
  }
  return true;
}

function findMethodHeaderStart(source: string, openBraceOffset: number, lowerBound: number): number {
  let start = openBraceOffset;
  while (start > lowerBound) {
    const previous = source[start - 1];
    if (previous === "\n" || previous === "\r" || previous === "{" || previous === "}" || previous === ";") {
      break;
    }
    start -= 1;
  }
  while (start < openBraceOffset && /\s/.test(source[start])) {
    start += 1;
  }
  return start;
}

function isMethodHeaderCandidate(header: string): boolean {
  const trimmed = header.trim();
  if (trimmed === "") {
    return false;
  }
  if (/^(if|for|while|switch|catch|else|do|try)\b/i.test(trimmed)) {
    return false;
  }
  const openParen = trimmed.indexOf("(");
  const closeParen = trimmed.lastIndexOf(")");
  if (openParen <= 0 || closeParen < openParen) {
    return isAccessorHeaderCandidate(trimmed);
  }
  return /[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*\)\s*$/.test(trimmed);
}

function extractMethodName(header: string): string | undefined {
  const trimmed = header.trim();
  const accessor = /(?:^|\s)(get|set)\s*$/i.exec(trimmed);
  if (accessor) {
    return accessor[1].toLowerCase();
  }
  const match = /([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)\s*$/.exec(trimmed);
  return match?.[1];
}

function isAccessorHeaderCandidate(header: string): boolean {
  return /^(?:(?:public|private|protected|global)\s+)*(?:get|set)\s*$/i.test(header);
}

function findDeclarationStart(source: string, declarationIndex: number): number {
  let start = declarationIndex;
  while (start > 0) {
    const previous = source[start - 1];
    if (previous === "\n" || previous === "\r" || previous === "{" || previous === "}" || previous === ";") {
      break;
    }
    start -= 1;
  }
  while (start < declarationIndex && /\s/.test(source[start])) {
    start += 1;
  }
  return start;
}

function collectBlockSpanNodes(source: string, bracePairs: Array<[number, number]>, start: number, end: number): ApexNode[] {
  const nodes: ApexNode[] = [];
  for (const [open, close] of bracePairs) {
    const closeEnd = close + 1;
    if (open < start || closeEnd > end) {
      continue;
    }
    nodes.push({
      kind: "block_span",
      text: source.slice(open, closeEnd),
      range: rangeFor(source, open, closeEnd),
      children: []
    });
  }
  return nodes;
}

function isTopLevelOffset(offset: number, bracePairs: Array<[number, number]>): boolean {
  for (const [open, close] of bracePairs) {
    if (offset > open && offset <= close) {
      return false;
    }
  }
  return true;
}

function collectComments(source: string): ApexComment[] {
  const comments: ApexComment[] = [];
  for (const token of scanStructuralTokens(source)) {
    if (token.kind !== "line-comment" && token.kind !== "block-comment") {
      continue;
    }
    comments.push({
      kind: token.kind === "line-comment" ? "line" : "block",
      text: token.text,
      value: token.text,
      printed: true,
      range: rangeFor(source, token.start, token.end)
    });
  }
  return comments;
}

function collectDiagnostics(source: string): ApexDiagnostic[] {
  const diagnostics: ApexDiagnostic[] = [];
  const delimiters = {
    brace: [] as number[],
    paren: [] as number[],
    bracket: [] as number[]
  };

  for (const token of scanStructuralTokens(source)) {
    if (token.kind === "open-brace") {
      delimiters.brace.push(token.start);
      continue;
    }
    if (token.kind === "close-brace") {
      const open = delimiters.brace.pop();
      if (open === undefined) {
        diagnostics.push(diagnostic(source, token.start, token.end, "APEX_BRACE_UNMATCHED_CLOSE", "Unmatched closing brace."));
      }
      continue;
    }
    if (token.kind === "open-paren") {
      delimiters.paren.push(token.start);
      continue;
    }
    if (token.kind === "close-paren") {
      const open = delimiters.paren.pop();
      if (open === undefined) {
        diagnostics.push(diagnostic(source, token.start, token.end, "APEX_PAREN_UNMATCHED_CLOSE", "Unmatched closing parenthesis."));
      }
      continue;
    }
    if (token.kind === "open-bracket") {
      delimiters.bracket.push(token.start);
      continue;
    }
    if (token.kind === "close-bracket") {
      const open = delimiters.bracket.pop();
      if (open === undefined) {
        diagnostics.push(diagnostic(source, token.start, token.end, "APEX_BRACKET_UNMATCHED_CLOSE", "Unmatched closing bracket."));
      }
    }
  }

  for (const open of delimiters.brace) {
    diagnostics.push(diagnostic(source, open, open + 1, "APEX_BRACE_UNMATCHED_OPEN", "Unmatched opening brace."));
  }
  for (const open of delimiters.paren) {
    diagnostics.push(diagnostic(source, open, open + 1, "APEX_PAREN_UNMATCHED_OPEN", "Unmatched opening parenthesis."));
  }
  for (const open of delimiters.bracket) {
    diagnostics.push(diagnostic(source, open, open + 1, "APEX_BRACKET_UNMATCHED_OPEN", "Unmatched opening bracket."));
  }

  return diagnostics;
}

type StructuralToken =
  | { kind: "line-comment" | "block-comment"; text: string; start: number; end: number }
  | { kind: "open-brace" | "close-brace" | "open-paren" | "close-paren" | "open-bracket" | "close-bracket"; text: string; start: number; end: number };

function scanStructuralTokens(source: string): StructuralToken[] {
  const tokens: StructuralToken[] = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (char === "'" || char === "\"") {
      index = scanQuotedLiteral(source, index, char);
      continue;
    }

    if (char === "[" && isBracketedQueryStart(source, index)) {
      const end = scanBracketedExpression(source, index);
      tokens.push({ kind: "open-bracket", text: char, start: index, end: index + 1 });
      if (end > index + 1 && source[end - 1] === "]") {
        tokens.push({ kind: "close-bracket", text: "]", start: end - 1, end });
      }
      index = end;
      continue;
    }

    if (char === "/" && next === "/") {
      const end = source.indexOf("\n", index);
      const stop = end === -1 ? source.length : end;
      tokens.push({ kind: "line-comment", text: source.slice(index, stop), start: index, end: stop });
      index = stop;
      continue;
    }

    if (char === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      const stop = end === -1 ? source.length : end + 2;
      tokens.push({ kind: "block-comment", text: source.slice(index, stop), start: index, end: stop });
      index = stop;
      continue;
    }

    if (char === "{") {
      tokens.push({ kind: "open-brace", text: char, start: index, end: index + 1 });
    } else if (char === "}") {
      tokens.push({ kind: "close-brace", text: char, start: index, end: index + 1 });
    } else if (char === "(") {
      tokens.push({ kind: "open-paren", text: char, start: index, end: index + 1 });
    } else if (char === ")") {
      tokens.push({ kind: "close-paren", text: char, start: index, end: index + 1 });
    } else if (char === "[") {
      tokens.push({ kind: "open-bracket", text: char, start: index, end: index + 1 });
    } else if (char === "]") {
      tokens.push({ kind: "close-bracket", text: char, start: index, end: index + 1 });
    }

    index += 1;
  }

  return tokens;
}

function scanQuotedLiteral(source: string, start: number, quote: string): number {
  let index = start + 1;
  while (index < source.length) {
    if (source[index] === "\\") {
      index += 2;
      continue;
    }
    if (source[index] === quote) {
      return index + 1;
    }
    index += 1;
  }
  return source.length;
}

function isBracketedQueryStart(source: string, start: number): boolean {
  return /^\[\s*(?:select|find)\b/i.test(source.slice(start, start + 32));
}

function scanBracketedExpression(source: string, start: number): number {
  let depth = 1;
  let index = start + 1;
  while (index < source.length && depth > 0) {
    const char = source[index];
    if (char === "'" || char === "\"") {
      index = scanQuotedLiteral(source, index, char);
      continue;
    }
    if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth -= 1;
    }
    index += 1;
  }
  return index;
}

function collectTokens(source: string, structuralTokens: StructuralToken[]): ApexToken[] {
  return structuralTokens.map((token) => ({
    kind: token.kind,
    text: token.text,
    range: rangeFor(source, token.start, token.end)
  }));
}

function pairDelimiterOffsets(
  tokens: StructuralToken[],
  openKind: "open-brace",
  closeKind: "close-brace"
): Array<[number, number]> {
  const stack: number[] = [];
  const ranges: Array<[number, number]> = [];
  for (const token of tokens) {
    if (token.kind === openKind) {
      stack.push(token.start);
      continue;
    }
    if (token.kind === closeKind) {
      const open = stack.pop();
      if (open !== undefined) {
        ranges.push([open, token.start]);
      }
    }
  }
  return ranges;
}

function diagnostic(source: string, start: number, end: number, code: string, message: string): ApexDiagnostic {
  return {
    severity: "error",
    code,
    message,
    range: rangeFor(source, start, end)
  };
}

function rangeFor(source: string, startOffset: number, endOffset: number): ApexRange {
  return {
    start: positionFor(source, startOffset),
    end: positionFor(source, endOffset)
  };
}

function positionFor(source: string, offset: number): ApexPosition {
  let line = 1;
  let column = 0;
  for (let index = 0; index < offset; index += 1) {
    if (source[index] === "\n") {
      line += 1;
      column = 0;
    } else {
      column += 1;
    }
  }
  return { line, column, offset };
}
