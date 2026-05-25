import type { Parser } from "prettier";

export type SalesforceMarkupDialect = "visualforce" | "aura" | "lwc" | "unknown";

export type SalesforceMarkupDocument = {
  kind: "salesforce-markup";
  source: string;
  dialect: SalesforceMarkupDialect;
  applySalesforceTransforms: boolean;
};

const LWC_DIRECTIVE_ATTRIBUTE_PATTERN = new RegExp(
  String.raw`<[\w:-]+` +
    String.raw`(?:\s+[\w:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|\{[^}]*\}|[^\s>]+))?)*` +
    String.raw`\s+(?:lwc:[\w-]+|for:each|for:item|for:index|iterator:[\w-]+|if:(?:true|false))(?:\s|=|>|/)`
);
const AURA_DIRECTIVE_ATTRIBUTE_PATTERN = new RegExp(
  String.raw`<[\w:-]+` +
    String.raw`(?:\s+[\w:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|\{[^}]*\}|[^\s>]+))?)*` +
    String.raw`\s+aura:[\w-]+(?:\s|=|>|/)`
);
const VISUALFORCE_XMLNS_ATTRIBUTE_PATTERN = new RegExp(
  String.raw`<[\w:-]+` +
    String.raw`(?:\s+[\w:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|\{[^}]*\}|[^\s>]+))?)*` +
    String.raw`\s+xmlns:apex\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)(?:\s|>|/)`
);

export function detectSalesforceMarkupDialect(source: string): SalesforceMarkupDialect {
  const scanSource = stripMarkupComments(source);

  if (/<\s*apex:|<\/\s*apex:/.test(scanSource)) {
    return "visualforce";
  }

  if (VISUALFORCE_XMLNS_ATTRIBUTE_PATTERN.test(scanSource)) {
    return "visualforce";
  }

  if (/<\s*aura:|<\/\s*aura:/.test(scanSource)) {
    return "aura";
  }

  if (AURA_DIRECTIVE_ATTRIBUTE_PATTERN.test(scanSource)) {
    return "aura";
  }

  if (LWC_DIRECTIVE_ATTRIBUTE_PATTERN.test(scanSource)) {
    return "lwc";
  }

  if (/<\s*template(?:\s|>)|<\/\s*template\s*>/.test(scanSource)) {
    return "lwc";
  }

  return "unknown";
}

function stripMarkupComments(source: string): string {
  let output = "";
  let index = 0;
  let inTag = false;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let commentMode: "html" | "salesforce" | null = null;

  while (index < source.length) {
    const next = source[index];

    if (commentMode === "html") {
      if (source.startsWith("-->", index)) {
        commentMode = null;
        index += 3;
      } else {
        index += 1;
      }
      continue;
    }

    if (commentMode === "salesforce") {
      if (source.startsWith("--}", index)) {
        commentMode = null;
        index += 3;
      } else {
        index += 1;
      }
      continue;
    }

    if (inTag && (inSingleQuote || inDoubleQuote) && next === "\\") {
      output += source.slice(index, index + 2);
      index += 2;
      continue;
    }

    if (inTag && !inDoubleQuote && next === "'") {
      inSingleQuote = !inSingleQuote;
      output += next;
      index += 1;
      continue;
    }

    if (inTag && !inSingleQuote && next === "\"") {
      inDoubleQuote = !inDoubleQuote;
      output += next;
      index += 1;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (source.startsWith("<!--", index)) {
        // Keep a non-whitespace sentinel so comment removal cannot stitch
        // nearby tokens into synthetic dialect signals.
        output += "\u0000";
        commentMode = "html";
        index += 4;
        continue;
      }
      if (source.startsWith("{!--", index)) {
        // Keep a non-whitespace sentinel so comment removal cannot stitch
        // nearby tokens into synthetic dialect signals.
        output += "\u0000";
        commentMode = "salesforce";
        index += 4;
        continue;
      }
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (!inTag && next === "<") {
        inTag = true;
      } else if (inTag && next === ">") {
        inTag = false;
      }
    }

    output += next;
    index += 1;
  }

  return output;
}

export const salesforceMarkupParser: Parser<SalesforceMarkupDocument> = {
  astFormat: "salesforce-markup",
  parse: (source, options) => {
    const filepath = getFilepathFromOptions(options);
    const dialect = resolveDialect(source, filepath);

    return {
      kind: "salesforce-markup",
      source,
      dialect,
      applySalesforceTransforms: shouldApplySalesforceTransforms(filepath, dialect)
    };
  },
  locStart: () => 0,
  locEnd: (node) => node.source.length
};

function resolveDialect(source: string, filepath: string | null): SalesforceMarkupDialect {
  const detected = detectSalesforceMarkupDialect(source);
  if (detected !== "unknown") {
    return detected;
  }

  if (filepath && filepath.toLowerCase().endsWith(".html") && isLwcHtmlComponentPath(filepath)) {
    return "lwc";
  }

  return "unknown";
}

function shouldApplySalesforceTransforms(filepath: string | null, dialect: SalesforceMarkupDialect): boolean {
  if (!filepath || !filepath.toLowerCase().endsWith(".html")) {
    return true;
  }

  return dialect === "lwc" && isLwcHtmlComponentPath(filepath);
}

function isLwcHtmlComponentPath(filepath: string): boolean {
  const normalized = filepath.replaceAll("\\", "/");
  const parts = normalized.split("/").filter((part) => part.length > 0);
  const lwcSegmentIndex = parts.lastIndexOf("lwc");
  if (lwcSegmentIndex === -1 || lwcSegmentIndex + 2 >= parts.length) {
    return false;
  }

  const componentName = parts[lwcSegmentIndex + 1];
  const filename = parts[parts.length - 1];
  const filenameWithoutExt = filename.slice(0, -".html".length);
  return filenameWithoutExt === componentName;
}

function getFilepathFromOptions(options: unknown): string | null {
  if (!options || typeof options !== "object") {
    return null;
  }

  const candidate = (options as { filepath?: unknown }).filepath;
  return typeof candidate === "string" ? candidate : null;
}
