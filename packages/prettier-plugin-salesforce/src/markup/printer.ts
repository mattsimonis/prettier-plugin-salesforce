import type { Printer } from "prettier";
import { applyFinalNewlinePreference } from "../shared/final-newline.js";
import { formatTagLike } from "../shared/tag-format.js";
import type { SalesforceMarkupDialect, SalesforceMarkupDocument } from "./parser.js";

export const salesforceMarkupPrinter: Printer<SalesforceMarkupDocument> = {
  print(path, options) {
    return formatSalesforceMarkup(path.node.source, path.node.dialect, path.node.applySalesforceTransforms, options);
  }
};

export function formatSalesforceMarkup(
  source: string,
  dialect: SalesforceMarkupDialect = "unknown",
  applySalesforceTransforms = true,
  options: { tabWidth?: unknown; useTabs?: unknown; salesforceFinalNewline?: unknown } = {}
): string {
  if (!applySalesforceTransforms) {
    return applyFinalNewlinePreference(ensureTrailingNewline(source), options);
  }

  const formatted = formatTagLike(source, options);
  if (dialect === "unknown") {
    return applyFinalNewlinePreference(formatted, options);
  }

  return applyFinalNewlinePreference(enforceDialectSpecificInlineRules(formatted, dialect, options), options);
}

function ensureTrailingNewline(source: string): string {
  const withoutTrailing = source.replace(/\n+$/, "");
  return `${withoutTrailing}\n`;
}

function enforceDialectSpecificInlineRules(
  source: string,
  dialect: SalesforceMarkupDialect,
  options: { tabWidth?: unknown; useTabs?: unknown }
): string {
  const tokens = source.split("\n");
  const lines: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const line = tokens[index];
    const expanded = expandInlineExpressionTagLine(line, dialect, tokens, index);
    const candidateLines = expanded.length === 0 ? [line] : expanded;
    for (const candidate of candidateLines) {
      const multiline = tryExpandAttributeLayout(candidate, dialect, options);
      if (multiline.length === 0) {
        lines.push(candidate);
        continue;
      }
      lines.push(...multiline);
    }
  }

  return `${lines.join("\n").replace(/\n+$/, "")}\n`;
}

type ParsedTagLine = {
  indent: string;
  tagName: string;
  attrsRaw: string;
  selfClosing: boolean;
};

type TagAttribute = {
  raw: string;
  hasExpression: boolean;
};

function tryExpandAttributeLayout(line: string, dialect: SalesforceMarkupDialect, options: { tabWidth?: unknown; useTabs?: unknown }): string[] {
  const parsed = parseOpenTagLine(line);
  if (!parsed) {
    return [];
  }

  const attrs = parseTagAttributes(parsed.attrsRaw);
  if (attrs.length < 2) {
    return [];
  }

  if (!shouldUseMultilineAttributeLayout(line, attrs, dialect)) {
    return [];
  }

  const output = [`${parsed.indent}<${parsed.tagName}`];
  const indentText = indentUnit(options);
  for (const attr of attrs) {
    output.push(`${parsed.indent}${indentText}${attr.raw}`);
  }
  output.push(parsed.selfClosing ? `${parsed.indent}/>` : `${parsed.indent}>`);
  return output;
}

function indentUnit(options: { tabWidth?: unknown; useTabs?: unknown }): string {
  if (options.useTabs === true) {
    return "\t";
  }
  const tabWidth = typeof options.tabWidth === "number" && Number.isFinite(options.tabWidth) && options.tabWidth > 0 ? options.tabWidth : 2;
  return " ".repeat(Math.trunc(tabWidth));
}

function parseOpenTagLine(line: string): ParsedTagLine | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("<") || !trimmed.endsWith(">")) {
    return null;
  }
  if (trimmed.startsWith("</") || trimmed.startsWith("<!") || trimmed.startsWith("<?")) {
    return null;
  }
  if (trimmed.includes("\n") || trimmed.includes("\r")) {
    return null;
  }

  const indentMatch = line.match(/^(\s*)/);
  const indent = indentMatch?.[1] ?? "";
  const content = line.slice(indent.length);
  const tagEnd = findStandaloneTagEnd(content);
  if (tagEnd === -1) {
    return null;
  }
  if (content.slice(tagEnd + 1).trim() !== "") {
    return null;
  }

  const match = content.slice(0, tagEnd + 1).match(/^<([\w:-]+)([\s\S]*?)>$/);
  if (!match) {
    return null;
  }

  const [, tagName, rawTail] = match;
  const selfClosing = /\/\s*$/.test(rawTail);
  const attrsRaw = selfClosing ? rawTail.replace(/\/\s*$/, "") : rawTail;
  if (attrsRaw.trim() === "") {
    return null;
  }

  return { indent, tagName, attrsRaw, selfClosing };
}

function shouldUseMultilineAttributeLayout(line: string, attrs: TagAttribute[], dialect: SalesforceMarkupDialect): boolean {
  const hasExpression = attrs.some((attr) => attr.hasExpression);
  if (!hasExpression) {
    return false;
  }

  const lineLengthFloor = dialect === "lwc" ? 88 : 84;
  return line.length >= lineLengthFloor || attrs.length >= 4;
}

function parseTagAttributes(attrsRaw: string): TagAttribute[] {
  const attrs: TagAttribute[] = [];
  let cursor = 0;

  while (cursor < attrsRaw.length) {
    while (cursor < attrsRaw.length && isWhitespace(attrsRaw[cursor])) {
      cursor += 1;
    }
    if (cursor >= attrsRaw.length) {
      break;
    }

    const start = cursor;
    while (cursor < attrsRaw.length && !isWhitespace(attrsRaw[cursor]) && attrsRaw[cursor] !== "=") {
      cursor += 1;
    }

    while (cursor < attrsRaw.length && isWhitespace(attrsRaw[cursor])) {
      cursor += 1;
    }

    if (cursor < attrsRaw.length && attrsRaw[cursor] === "=") {
      cursor += 1;
      while (cursor < attrsRaw.length && isWhitespace(attrsRaw[cursor])) {
        cursor += 1;
      }

      if (cursor < attrsRaw.length) {
        const valueStart = attrsRaw[cursor];
        if (valueStart === "'" || valueStart === "\"") {
          cursor = consumeQuotedValue(attrsRaw, cursor, valueStart);
        } else if (valueStart === "{") {
          cursor = consumeBraceValue(attrsRaw, cursor);
        } else {
          while (cursor < attrsRaw.length && !isWhitespace(attrsRaw[cursor])) {
            cursor += 1;
          }
        }
      }
    }

    const raw = attrsRaw.slice(start, cursor).trim();
    if (raw !== "") {
      attrs.push({ raw, hasExpression: raw.includes("{!") || raw.includes("{") });
    }
  }

  return attrs;
}

function consumeQuotedValue(source: string, start: number, quote: string): number {
  let cursor = start + 1;
  while (cursor < source.length) {
    if (source[cursor] === "\\") {
      cursor += 2;
      continue;
    }
    if (source[cursor] === quote) {
      return cursor + 1;
    }
    cursor += 1;
  }
  return source.length;
}

function consumeBraceValue(source: string, start: number): number {
  let cursor = start;
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  while (cursor < source.length) {
    const char = source[cursor];
    if ((inSingleQuote || inDoubleQuote) && char === "\\") {
      cursor += 2;
      continue;
    }
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      cursor += 1;
      continue;
    }
    if (char === "\"" && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      cursor += 1;
      continue;
    }
    if (!inSingleQuote && !inDoubleQuote) {
      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          return cursor + 1;
        }
      }
    }
    cursor += 1;
  }

  return source.length;
}

function isWhitespace(char: string): boolean {
  return char === " " || char === "\t" || char === "\n" || char === "\r";
}

function findStandaloneTagEnd(line: string): number {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let braceDepth = 0;

  for (let index = 1; index < line.length; index += 1) {
    const char = line[index];
    if ((inSingleQuote || inDoubleQuote) && char === "\\") {
      index += 1;
      continue;
    }
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (char === "\"" && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    if (!inSingleQuote && !inDoubleQuote) {
      if (char === "{") {
        braceDepth += 1;
        continue;
      }
      if (char === "}") {
        braceDepth = Math.max(braceDepth - 1, 0);
        continue;
      }
      if (char === ">" && braceDepth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function expandInlineExpressionTagLine(
  line: string,
  dialect: SalesforceMarkupDialect,
  allLines: string[],
  lineIndex: number
): string[] {
  const inlineTag = parseInlineTagLine(line);
  if (!inlineTag) {
    return [];
  }

  if (!isSafeInlineExpressionBlock(inlineTag.rawText, dialect)) {
    return [];
  }

  const hasAdjacentSelfClosingSibling = lineHasAdjacentSelfClosingSiblingAtSameDepth(allLines, lineIndex, inlineTag.indent);
  if (!shouldExpandInlineTag(inlineTag.tagName, dialect, hasAdjacentSelfClosingSibling)) {
    return [];
  }

  return [
    `${inlineTag.indent}<${inlineTag.tagName}${inlineTag.attrs}>`,
    `${inlineTag.indent}  ${inlineTag.rawText}`,
    `${inlineTag.indent}</${inlineTag.tagName}>`
  ];
}

type InlineTagLine = {
  indent: string;
  tagName: string;
  attrs: string;
  rawText: string;
};

function parseInlineTagLine(line: string): InlineTagLine | null {
  const indentMatch = line.match(/^(\s*)/);
  const indent = indentMatch?.[1] ?? "";
  const content = line.slice(indent.length);
  if (!content.startsWith("<")) {
    return null;
  }

  const openTagEnd = findStandaloneTagEnd(content);
  if (openTagEnd === -1) {
    return null;
  }

  const openTag = content.slice(0, openTagEnd + 1);
  const openTagMatch = openTag.match(/^<([\w:-]+)([\s\S]*?)>$/);
  if (!openTagMatch) {
    return null;
  }

  const [, tagName, attrs] = openTagMatch;
  const closeTag = `</${tagName}>`;
  const closeTagIndex = content.lastIndexOf(closeTag);
  if (closeTagIndex === -1 || closeTagIndex <= openTagEnd) {
    return null;
  }

  if (content.slice(closeTagIndex + closeTag.length).trim() !== "") {
    return null;
  }

  const rawText = content.slice(openTagEnd + 1, closeTagIndex);
  if (rawText.trim() === "") {
    return null;
  }

  return { indent, tagName, attrs, rawText };
}

function isSafeInlineExpressionBlock(rawText: string, dialect: SalesforceMarkupDialect): boolean {
  if (rawText.trim() === "") {
    return false;
  }

  if (rawText.includes("\n") || rawText.includes("\r")) {
    return false;
  }

  const text = rawText.trim();
  if (dialect === "visualforce" || dialect === "aura") {
    return isBalancedWrappedExpression(text, "{!", "}");
  }

  if (dialect === "lwc") {
    return isBalancedWrappedExpression(text, "{", "}");
  }

  return false;
}

function isBalancedWrappedExpression(text: string, open: string, close: string): boolean {
  if (!text.startsWith(open) || !text.endsWith(close)) {
    return false;
  }

  if (text.length <= open.length + close.length) {
    return false;
  }

  const bodyStart = open.length;
  const bodyEnd = text.length - close.length;
  const body = text.slice(bodyStart, bodyEnd);
  if (body.trim() === "") {
    return false;
  }

  return hasBalancedCurlyBraces(body);
}

function hasBalancedCurlyBraces(text: string): boolean {
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if ((inSingleQuote || inDoubleQuote) && char === "\\") {
      index += 1;
      continue;
    }
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (char === "\"" && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    if (inSingleQuote || inDoubleQuote) {
      continue;
    }
    if (char === "{") {
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth < 0) {
        return false;
      }
    }
  }
  return depth === 0;
}

function shouldExpandInlineTag(
  tagName: string,
  dialect: SalesforceMarkupDialect,
  hasAdjacentSelfClosingSibling: boolean
): boolean {
  const name = tagName.toLowerCase();

  if (dialect === "lwc") {
    if (name === "template") {
      return true;
    }
    return hasAdjacentSelfClosingSibling && !name.includes(":");
  }

  if (dialect === "aura") {
    if (name.startsWith("aura:")) {
      return true;
    }
    return hasAdjacentSelfClosingSibling && !name.includes(":");
  }

  if (dialect === "visualforce") {
    if (name.startsWith("apex:")) {
      return true;
    }
    return hasAdjacentSelfClosingSibling && !name.includes(":");
  }

  return false;
}

function lineHasAdjacentSelfClosingSiblingAtSameDepth(lines: string[], lineIndex: number, indent: string): boolean {
  return (
    hasNearestSelfClosingSiblingAtSameDepth(lines, lineIndex, indent, -1) ||
    hasNearestSelfClosingSiblingAtSameDepth(lines, lineIndex, indent, 1)
  );
}

function hasNearestSelfClosingSiblingAtSameDepth(
  lines: string[],
  lineIndex: number,
  indent: string,
  direction: -1 | 1
): boolean {
  let cursor = lineIndex + direction;
  while (cursor >= 0 && cursor < lines.length) {
    const line = lines[cursor];
    const trimmed = line.trim();
    if (trimmed === "" || isCommentBoundaryOrBodyLine(lines, cursor, trimmed)) {
      cursor += direction;
      continue;
    }
    if (!hasIndent(line, indent)) {
      return false;
    }

    return isSelfClosingTagLineAtSameDepth(lines, cursor, indent);
  }

  return false;
}

function isSelfClosingTagLineAtSameDepth(lines: string[], lineIndex: number, indent: string): boolean {
  if (lineIndex < 0 || lineIndex >= lines.length) {
    return false;
  }

  const line = lines[lineIndex];
  if (!hasIndent(line, indent)) {
    return false;
  }

  const trimmed = line.trim();
  if (trimmed === "") {
    return false;
  }

  const parsed = parseOpenTagLine(line);
  return parsed?.selfClosing ?? false;
}

function hasIndent(line: string, indent: string): boolean {
  const indentMatch = line.match(/^(\s*)/);
  return (indentMatch?.[1] ?? "") === indent;
}

function isCommentOnlyLine(trimmed: string): boolean {
  if (trimmed.startsWith("<!--")) {
    return true;
  }
  if (trimmed.startsWith("-->")) {
    return true;
  }

  if (trimmed.startsWith("{!--")) {
    return true;
  }

  return trimmed.startsWith("--}");
}

function isCommentBoundaryOrBodyLine(lines: string[], lineIndex: number, trimmed: string): boolean {
  if (isCommentOnlyLine(trimmed)) {
    return true;
  }

  return isInsideMultilineComment(lines, lineIndex, "{!--", "--}") || isInsideMultilineComment(lines, lineIndex, "<!--", "-->");
}

function isInsideMultilineComment(lines: string[], lineIndex: number, openToken: string, closeToken: string): boolean {
  for (let cursor = lineIndex; cursor >= 0; cursor -= 1) {
    const line = lines[cursor];
    const openAt = findLastTokenOutsideQuotes(line, openToken);
    const closeAt = findLastTokenOutsideQuotes(line, closeToken);

    if (openAt === -1 && closeAt === -1) {
      continue;
    }

    if (openAt > closeAt) {
      if (openAt !== -1 && line.indexOf(closeToken, openAt + openToken.length) !== -1) {
        return false;
      }
      return true;
    }

    return false;
  }

  return false;
}

function findLastTokenOutsideQuotes(line: string, token: string): number {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let foundAt = -1;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if ((inSingleQuote || inDoubleQuote) && char === "\\") {
      index += 1;
      continue;
    }
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (char === "\"" && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    if (inSingleQuote || inDoubleQuote) {
      continue;
    }
    if (line.startsWith(token, index)) {
      foundAt = index;
      index += token.length - 1;
    }
  }

  return foundAt;
}
