import type { Printer } from "prettier";
import { formatTagLike } from "../shared/tag-format.js";
import type { MetadataXmlDocument } from "./parser.js";

export const metadataXmlPrinter: Printer<MetadataXmlDocument> = {
  print(path, options) {
    if (!path.node.applyMetadataTransforms) {
      return passthroughWithSingleTrailingNewline(path.node.source);
    }

    const formatted = formatXmlConservative(path.node.source, options);
    if (!shouldSortLabelEntries(path.node.source, options)) {
      return formatted;
    }

    return sortCustomLabelEntriesByFullName(formatted);
  }
};

export function formatXmlConservative(source: string, options: { tabWidth?: unknown; useTabs?: unknown } = {}): string {
  const normalizedSource = normalizeLineEndings(source);
  if (normalizedSource.trim() === "") {
    return "\n";
  }
  if (hasRawTextAngleBracket(normalizedSource)) {
    return ensureTrailingNewline(normalizedSource.trim());
  }
  if (hasLowConfidenceTextConstructs(normalizedSource)) {
    return ensureTrailingNewline(normalizedSource.trim());
  }

  const formatted = formatTagLike(normalizedSource, options);
  if (!preservesXmlStructure(normalizedSource, formatted)) {
    return ensureTrailingNewline(normalizedSource.trim());
  }
  if (!preservesSiblingBlockStructure(normalizedSource, formatted)) {
    return ensureTrailingNewline(normalizedSource.trim());
  }
  if (!preservesChildSequenceStructure(normalizedSource, formatted)) {
    return ensureTrailingNewline(normalizedSource.trim());
  }
  if (!preservesStartTagAttributeStructure(normalizedSource, formatted)) {
    return ensureTrailingNewline(normalizedSource.trim());
  }
  if (!preservesStartTagAttributeValueShape(normalizedSource, formatted)) {
    return ensureTrailingNewline(normalizedSource.trim());
  }

  const secondPass = formatTagLike(formatted, options);
  if (secondPass !== formatted) {
    return ensureTrailingNewline(normalizedSource.trim());
  }

  return formatted;
}

export function extractElementOrder(source: string): string[] {
  const order: string[] = [];
  const tagPattern = /<([A-Za-z_][A-Za-z0-9_.:-]*)(?:\s|>|\/)/g;
  for (const match of source.matchAll(tagPattern)) {
    order.push(match[1]);
  }
  return order;
}

function normalizeLineEndings(source: string): string {
  return source.replace(/\r\n?/g, "\n");
}

function ensureTrailingNewline(source: string): string {
  return source.endsWith("\n") ? source : `${source}\n`;
}

function passthroughWithSingleTrailingNewline(source: string): string {
  return `${source.trimEnd()}\n`;
}

function shouldSortLabelEntries(source: string, options: unknown): boolean {
  if (!isLabelSortEnabled(options)) {
    return false;
  }

  const filepath = getFilepathFromOptions(options);
  if (filepath && hasLabelsMetadataPath(filepath)) {
    return true;
  }

  return /<\s*(?:[A-Za-z_][A-Za-z0-9_.-]*:)?CustomLabels(?:\s|>)/.test(source);
}

function hasLabelsMetadataPath(filepath: string): boolean {
  const normalized = filepath.toLowerCase();
  return (
    normalized.endsWith(".labels") ||
    normalized.endsWith(".labels-meta.xml") ||
    normalized.endsWith(".labels-meta.xml.tmp")
  );
}

function isLabelSortEnabled(options: unknown): boolean {
  if (!options || typeof options !== "object") {
    return false;
  }
  const typed = options as {
    salesforceSortLabelsByFullName?: unknown;
    salesforceSortLabelEntriesByFullName?: unknown;
  };
  return typed.salesforceSortLabelsByFullName === true || typed.salesforceSortLabelEntriesByFullName === true;
}

function getFilepathFromOptions(options: unknown): string | null {
  if (!options || typeof options !== "object") {
    return null;
  }

  const filepath = (options as { filepath?: unknown }).filepath;
  return typeof filepath === "string" ? filepath : null;
}

function sortCustomLabelEntriesByFullName(source: string): string {
  const root = extractCustomLabelsRoot(source);
  if (!root) {
    return source;
  }

  const labelsPattern = /<(?:[A-Za-z_][A-Za-z0-9_.-]*:)?labels\b[^>]*>[\s\S]*?<\/(?:[A-Za-z_][A-Za-z0-9_.-]*:)?labels>/g;
  const inner = root.inner;
  const labelBlocks = Array.from(inner.matchAll(labelsPattern));
  if (labelBlocks.length < 2) {
    return source;
  }

  const extracted = labelBlocks.map((match) => {
    const labelStart = match.index ?? 0;
    const textStart = findLeadingLabelTriviaStart(inner, labelStart);
    return {
      text: inner.slice(textStart, labelStart + match[0].length),
      start: textStart,
      end: labelStart + match[0].length,
      fullName: extractLabelFullName(match[0])
    };
  });

  if (extracted.some((entry) => entry.fullName === null)) {
    return source;
  }

  const sorted = [...extracted].sort((left, right) => {
    const nameCompare = compareLabelFullNames(left.fullName as string, right.fullName as string);
    if (nameCompare !== 0) {
      return nameCompare;
    }
    return left.text.localeCompare(right.text);
  });

  const sortedTexts = sorted.map((entry) => entry.text);
  const first = extracted[0];
  const last = extracted[extracted.length - 1];
  const rewrittenInner = `${inner.slice(0, first.start)}${sortedTexts.join("")}${inner.slice(last.end)}`;

  const replaced = `${source.slice(0, root.innerStart)}${rewrittenInner}${source.slice(root.innerEnd)}`;
  return ensureTrailingNewline(replaced.trimEnd());
}

function findLeadingLabelTriviaStart(source: string, labelStart: number): number {
  let cursor = labelStart;
  while (cursor > 0) {
    const whitespaceStart = scanWhitespaceBackward(source, cursor);
    const comment = scanXmlCommentBackward(source, whitespaceStart);
    if (comment === null) {
      return whitespaceStart;
    }
    cursor = comment.start;
  }
  return cursor;
}

function scanWhitespaceBackward(source: string, end: number): number {
  let cursor = end;
  while (cursor > 0 && /\s/.test(source[cursor - 1])) {
    cursor -= 1;
  }
  return cursor;
}

function scanXmlCommentBackward(source: string, end: number): { start: number; end: number } | null {
  if (end < "-->".length || !source.slice(0, end).endsWith("-->")) {
    return null;
  }
  const start = source.lastIndexOf("<!--", end - "-->".length);
  if (start === -1) {
    return null;
  }
  return { start, end };
}

function compareLabelFullNames(left: string, right: string): number {
  const leftKey = normalizeLabelSortKey(left);
  const rightKey = normalizeLabelSortKey(right);
  if (leftKey < rightKey) {
    return -1;
  }
  if (leftKey > rightKey) {
    return 1;
  }
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function normalizeLabelSortKey(value: string): string {
  return value.normalize("NFKD").toLowerCase();
}

function extractLabelFullName(labelBlock: string): string | null {
  const fullNameMatch =
    /<(?:[A-Za-z_][A-Za-z0-9_.-]*:)?fullName\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z_][A-Za-z0-9_.-]*:)?fullName>/.exec(
      labelBlock
    );
  if (!fullNameMatch) {
    return null;
  }
  return fullNameMatch[1].trim();
}

function extractCustomLabelsRoot(
  source: string
): { prefix: string; inner: string; innerStart: number; innerEnd: number } | null {
  const openMatch = /<([A-Za-z_][A-Za-z0-9_.-]*:)?CustomLabels\b[^>]*>/.exec(source);
  if (!openMatch || openMatch.index === undefined) {
    return null;
  }

  const prefix = openMatch[1] ?? "";
  const openTag = openMatch[0];
  const innerStart = openMatch.index + openTag.length;
  const closeTag = `</${prefix}CustomLabels>`;
  const innerEnd = source.lastIndexOf(closeTag);
  if (innerEnd < innerStart) {
    return null;
  }

  return {
    prefix,
    inner: source.slice(innerStart, innerEnd),
    innerStart,
    innerEnd
  };
}

function preservesXmlStructure(original: string, formatted: string): boolean {
  const originalSequence = extractXmlNodeSequence(original);
  const formattedSequence = extractXmlNodeSequence(formatted);
  if (originalSequence.length !== formattedSequence.length) {
    return false;
  }

  for (let index = 0; index < originalSequence.length; index += 1) {
    if (originalSequence[index] !== formattedSequence[index]) {
      return false;
    }
  }

  return true;
}

function extractXmlNodeSequence(source: string): string[] {
  const sequence: string[] = [];
  const tagPattern = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/?[A-Za-z_][A-Za-z0-9_.:-]*(?:\s[^<>]*?)?\/?>/g;
  let cursor = 0;

  for (const match of source.matchAll(tagPattern)) {
    const start = match.index ?? 0;
    const between = source.slice(cursor, start);
    if (between.trim() !== "") {
      sequence.push("#text");
    }

    const token = match[0];
    sequence.push(classifyTagToken(token));
    cursor = start + token.length;
  }

  const tail = source.slice(cursor);
  if (tail.trim() !== "") {
    sequence.push("#text");
  }

  return sequence;
}

function hasRawTextAngleBracket(source: string): boolean {
  const tagPattern = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/?[A-Za-z_][A-Za-z0-9_.:-]*(?:\s[^<>]*?)?\/?>/g;
  let cursor = 0;
  for (const match of source.matchAll(tagPattern)) {
    const start = match.index ?? 0;
    if (source.slice(cursor, start).includes("<")) {
      return true;
    }
    cursor = start + match[0].length;
  }
  return source.slice(cursor).includes("<");
}

function hasLowConfidenceTextConstructs(source: string): boolean {
  if (source.includes("<![CDATA[")) {
    return true;
  }

  const entityAnglePattern = /&(?:lt|gt|#0*60|#0*62|#x0*3[cC]|#X0*3[cC]|#x0*3[eE]|#X0*3[eE]);/;
  return entityAnglePattern.test(source);
}

function preservesSiblingBlockStructure(original: string, formatted: string): boolean {
  const originalBlocks = extractSiblingBlockSignature(original);
  const formattedBlocks = extractSiblingBlockSignature(formatted);
  if (originalBlocks.length !== formattedBlocks.length) {
    return false;
  }
  for (let index = 0; index < originalBlocks.length; index += 1) {
    if (originalBlocks[index] !== formattedBlocks[index]) {
      return false;
    }
  }
  return true;
}

function preservesChildSequenceStructure(original: string, formatted: string): boolean {
  const originalSignature = extractChildSequenceSignature(original);
  const formattedSignature = extractChildSequenceSignature(formatted);
  if (originalSignature.length !== formattedSignature.length) {
    return false;
  }
  for (let index = 0; index < originalSignature.length; index += 1) {
    if (originalSignature[index] !== formattedSignature[index]) {
      return false;
    }
  }
  return true;
}

function preservesStartTagAttributeStructure(original: string, formatted: string): boolean {
  const originalSignature = extractStartTagAttributeSignature(original);
  const formattedSignature = extractStartTagAttributeSignature(formatted);
  if (originalSignature.length !== formattedSignature.length) {
    return false;
  }
  for (let index = 0; index < originalSignature.length; index += 1) {
    if (originalSignature[index] !== formattedSignature[index]) {
      return false;
    }
  }
  return true;
}

function preservesStartTagAttributeValueShape(original: string, formatted: string): boolean {
  const originalSignature = extractStartTagAttributeValueSignature(original);
  const formattedSignature = extractStartTagAttributeValueSignature(formatted);
  if (originalSignature.length !== formattedSignature.length) {
    return false;
  }
  for (let index = 0; index < originalSignature.length; index += 1) {
    if (originalSignature[index] !== formattedSignature[index]) {
      return false;
    }
  }
  return true;
}

export function extractSiblingBlockSignature(source: string): string[] {
  const signatures: string[] = [];
  const tagPattern = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/?[A-Za-z_][A-Za-z0-9_.:-]*(?:\s[^<>]*?)?\/?>/g;
  const stack: string[] = [];
  for (const match of source.matchAll(tagPattern)) {
    const token = match[0].trim();
    if (token.startsWith("<?") || token.startsWith("<!--")) {
      continue;
    }

    if (token.startsWith("</")) {
      const closeName = extractTagName(token);
      while (stack.length > 0) {
        const openName = stack.pop();
        if (openName === closeName) {
          break;
        }
      }
      continue;
    }

    const depth = stack.length;
    const tagName = extractTagName(token);
    const kind = token.endsWith("/>") ? "self" : "open";
    const parent = stack[stack.length - 1] ?? "#root";
    signatures.push(`${depth}|${parent}|${kind}|${tagName}`);
    if (kind === "open") {
      stack.push(tagName);
    }
  }
  return signatures;
}

export function extractChildSequenceSignature(source: string): string[] {
  const signature: string[] = [];
  const tagPattern = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/?[A-Za-z_][A-Za-z0-9_.:-]*(?:\s[^<>]*?)?\/?>/g;
  const stack: string[] = [];
  let cursor = 0;

  for (const match of source.matchAll(tagPattern)) {
    const start = match.index ?? 0;
    const between = source.slice(cursor, start);
    if (between.trim() !== "") {
      const parent = stack[stack.length - 1] ?? "#root";
      signature.push(`${stack.length}|${parent}|text`);
    }

    const token = match[0].trim();
    if (token.startsWith("<?")) {
      signature.push(`${stack.length}|${stack[stack.length - 1] ?? "#root"}|pi`);
      cursor = start + match[0].length;
      continue;
    }
    if (token.startsWith("<!--")) {
      signature.push(`${stack.length}|${stack[stack.length - 1] ?? "#root"}|comment`);
      cursor = start + match[0].length;
      continue;
    }

    if (token.startsWith("</")) {
      const closeName = extractTagName(token);
      while (stack.length > 0) {
        const openName = stack.pop();
        if (openName === closeName) {
          break;
        }
      }
      cursor = start + match[0].length;
      continue;
    }

    const tagName = extractTagName(token);
    const parent = stack[stack.length - 1] ?? "#root";
    if (token.endsWith("/>")) {
      signature.push(`${stack.length}|${parent}|self:${tagName}`);
    } else {
      signature.push(`${stack.length}|${parent}|open:${tagName}`);
      stack.push(tagName);
    }
    cursor = start + match[0].length;
  }

  const tail = source.slice(cursor);
  if (tail.trim() !== "") {
    const parent = stack[stack.length - 1] ?? "#root";
    signature.push(`${stack.length}|${parent}|text`);
  }
  return signature;
}

export function extractStartTagAttributeSignature(source: string): string[] {
  const signature: string[] = [];
  const tagPattern = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/?[A-Za-z_][A-Za-z0-9_.:-]*(?:\s[^<>]*?)?\/?>/g;
  const stack: string[] = [];

  for (const match of source.matchAll(tagPattern)) {
    const token = match[0].trim();

    if (token.startsWith("<?") || token.startsWith("<!--")) {
      continue;
    }
    if (token.startsWith("</")) {
      const closeName = extractTagName(token);
      while (stack.length > 0) {
        const openName = stack.pop();
        if (openName === closeName) {
          break;
        }
      }
      continue;
    }

    const tagName = extractTagName(token);
    const parent = stack[stack.length - 1] ?? "#root";
    const depth = stack.length;
    const attrs = extractAttributeNames(token);
    signature.push(`${depth}|${parent}|${tagName}|${attrs.join(",")}`);
    if (!token.endsWith("/>")) {
      stack.push(tagName);
    }
  }

  return signature;
}

export function extractStartTagAttributeValueSignature(source: string): string[] {
  const signature: string[] = [];
  const tagPattern = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/?[A-Za-z_][A-Za-z0-9_.:-]*(?:\s[^<>]*?)?\/?>/g;
  const stack: string[] = [];

  for (const match of source.matchAll(tagPattern)) {
    const token = match[0].trim();

    if (token.startsWith("<?") || token.startsWith("<!--")) {
      continue;
    }
    if (token.startsWith("</")) {
      const closeName = extractTagName(token);
      while (stack.length > 0) {
        const openName = stack.pop();
        if (openName === closeName) {
          break;
        }
      }
      continue;
    }

    const tagName = extractTagName(token);
    const parent = stack[stack.length - 1] ?? "#root";
    const depth = stack.length;
    const attrs = extractAttributeNameValuePairs(token);
    signature.push(`${depth}|${parent}|${tagName}|${attrs.join(",")}`);
    if (!token.endsWith("/>")) {
      stack.push(tagName);
    }
  }

  return signature;
}

function classifyTagToken(tag: string): string {
  const trimmed = tag.trim();
  if (trimmed.startsWith("<!--")) {
    return `comment:${trimmed}`;
  }
  if (trimmed.startsWith("<?")) {
    return `pi:${trimmed}`;
  }
  if (trimmed.startsWith("</")) {
    return `close:${extractTagName(trimmed)}`;
  }
  if (trimmed.endsWith("/>")) {
    return `self:${extractTagName(trimmed)}`;
  }
  return `open:${extractTagName(trimmed)}`;
}

function extractTagName(tag: string): string {
  return tag.replace(/^<\//, "<").replace(/^</, "").replace(/[\s/>].*$/, "");
}

function extractAttributeNames(tag: string): string[] {
  const attrs: string[] = [];
  const tagBody = tag
    .replace(/^<\//, "<")
    .replace(/^</, "")
    .replace(/\/?>$/, "");
  const firstSpace = tagBody.search(/\s/);
  if (firstSpace < 0) {
    return attrs;
  }
  const attrSource = tagBody.slice(firstSpace + 1);
  const attrPattern = /([A-Za-z_:][A-Za-z0-9_.:-]*)\s*=/g;
  for (const match of attrSource.matchAll(attrPattern)) {
    attrs.push(match[1]);
  }
  return attrs;
}

function extractAttributeNameValuePairs(tag: string): string[] {
  const attrs: string[] = [];
  const tagBody = tag
    .replace(/^<\//, "<")
    .replace(/^</, "")
    .replace(/\/?>$/, "");
  const firstSpace = tagBody.search(/\s/);
  if (firstSpace < 0) {
    return attrs;
  }
  const attrSource = tagBody.slice(firstSpace + 1);
  const attrPattern = /([A-Za-z_:][A-Za-z0-9_.:-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  for (const match of attrSource.matchAll(attrPattern)) {
    const name = match[1];
    const rawValue = match[2] ?? "";
    attrs.push(`${name}=${rawValue}`);
  }
  return attrs;
}
