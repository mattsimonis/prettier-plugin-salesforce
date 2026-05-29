type TagToken =
  | { kind: "tag"; value: string }
  | { kind: "text"; value: string };

type IndentOptions = {
  tabWidth?: unknown;
  useTabs?: unknown;
};

export function formatTagLike(source: string, options: IndentOptions = {}): string {
  const tokens = tokenizeTags(source.replace(/\r\n?/g, "\n").trim());
  const lines: string[] = [];
  let indent = 0;
  const indentText = indentUnit(options);

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind === "text") {
      const text = token.value.trim();
      if (text !== "") {
        lines.push(`${spaces(indent, indentText)}${text}`);
      }
      continue;
    }

    const tag = normalizeTagWhitespace(token.value.trim());
    if (isClosingTag(tag)) {
      indent = Math.max(indent - 1, 0);
      lines.push(`${spaces(indent, indentText)}${tag}`);
      continue;
    }

    if (isSelfClosingTag(tag) || isSpecialTag(tag)) {
      lines.push(`${spaces(indent, indentText)}${tag}`);
      continue;
    }

    const next = tokens[index + 1];
    const nextNext = tokens[index + 2];
    const tagName = extractTagName(tag);
    if (
      next?.kind === "text" &&
      nextNext?.kind === "tag" &&
      next.value.trim() !== "" &&
      !next.value.includes("<") &&
      !next.value.includes("\n") &&
      isClosingTag(nextNext.value) &&
      extractTagName(nextNext.value) === tagName
    ) {
      lines.push(`${spaces(indent, indentText)}${tag}${next.value.trim()}${nextNext.value.trim()}`);
      index += 2;
      continue;
    }

    lines.push(`${spaces(indent, indentText)}${tag}`);
    indent += 1;
  }

  return `${lines.join("\n")}\n`;
}

function tokenizeTags(source: string): TagToken[] {
  const tokens: TagToken[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    const open = source.indexOf("<", cursor);
    if (open === -1) {
      tokens.push({ kind: "text", value: source.slice(cursor) });
      break;
    }
    if (open > cursor) {
      tokens.push({ kind: "text", value: source.slice(cursor, open) });
    }

    const close = findTagEnd(source, open);
    const tag = source.slice(open, close + 1);
    tokens.push({ kind: "tag", value: tag });

    const rawTextTagName = rawTextTagNameOf(tag);
    if (rawTextTagName !== null) {
      const rawClose = findRawTextCloseTag(source, rawTextTagName, close + 1);
      if (rawClose !== null) {
        if (rawClose.start > close + 1) {
          tokens.push({ kind: "text", value: source.slice(close + 1, rawClose.start) });
        }
        tokens.push({ kind: "tag", value: source.slice(rawClose.start, rawClose.end) });
        cursor = rawClose.end;
        continue;
      }
    }

    cursor = close + 1;
  }

  return tokens;
}

function findTagEnd(source: string, start: number): number {
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index];
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === "\"" && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    if (char === ">" && !inSingleQuote && !inDoubleQuote) {
      return index;
    }
  }

  return source.length - 1;
}

function normalizeTagWhitespace(tag: string): string {
  if (!tag.includes("\n") && !tag.includes("\r") && !tag.includes("\t")) {
    return tag;
  }

  let normalized = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let braceDepth = 0;
  let pendingWhitespace = false;

  for (let index = 0; index < tag.length; index += 1) {
    const char = tag[index];

    if (pendingWhitespace && !isWhitespace(char)) {
      if (normalized !== "" && !normalized.endsWith("<") && !normalized.endsWith("/") && char !== ">" && char !== "/") {
        normalized += " ";
      }
      pendingWhitespace = false;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      normalized += char;
      continue;
    }
    if (char === "\"" && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      normalized += char;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (char === "{") {
        braceDepth += 1;
        normalized += char;
        continue;
      }
      if (char === "}") {
        braceDepth = Math.max(braceDepth - 1, 0);
        normalized += char;
        continue;
      }
    }

    if (!inSingleQuote && !inDoubleQuote && braceDepth === 0 && isWhitespace(char)) {
      pendingWhitespace = true;
      continue;
    }

    normalized += char;
  }

  return normalized;
}

function extractTagName(tag: string): string {
  const cleaned = tag.replace(/^<\//, "<").replace(/^</, "").replace(/[\s/>].*$/, "");
  return cleaned;
}

function isClosingTag(tag: string): boolean {
  return /^<\//.test(tag);
}

function isSelfClosingTag(tag: string): boolean {
  return /\/>$/.test(tag);
}

function isSpecialTag(tag: string): boolean {
  return /^<!|^<\?/.test(tag);
}

function rawTextTagNameOf(tag: string): string | null {
  if (isClosingTag(tag) || isSelfClosingTag(tag) || isSpecialTag(tag)) {
    return null;
  }
  const tagName = extractTagName(tag).toLowerCase();
  return tagName === "script" || tagName === "style" ? tagName : null;
}

function findRawTextCloseTag(source: string, tagName: string, start: number): { start: number; end: number } | null {
  const closePattern = new RegExp(`</${escapeRegExp(tagName)}\\s*>`, "i");
  const match = closePattern.exec(source.slice(start));
  if (!match || match.index === undefined) {
    return null;
  }
  const closeStart = start + match.index;
  return { start: closeStart, end: closeStart + match[0].length };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isWhitespace(char: string): boolean {
  return char === " " || char === "\t" || char === "\n" || char === "\r";
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
