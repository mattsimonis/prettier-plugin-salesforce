const APEX_KEYWORDS = new Set([
  "abstract",
  "after",
  "all",
  "array",
  "as",
  "asc",
  "before",
  "break",
  "bulk",
  "by",
  "catch",
  "category",
  "class",
  "commit",
  "continue",
  "cube",
  "custom",
  "data",
  "delete",
  "desc",
  "do",
  "else",
  "enum",
  "end",
  "excludes",
  "extends",
  "fields",
  "final",
  "finally",
  "first",
  "for",
  "from",
  "get",
  "global",
  "group",
  "having",
  "if",
  "implements",
  "in",
  "includes",
  "inherited",
  "insert",
  "instanceof",
  "int",
  "interface",
  "last",
  "like",
  "limit",
  "merge",
  "new",
  "not",
  "nulls",
  "offset",
  "on",
  "order",
  "override",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "rollback",
  "rollup",
  "rows",
  "savepoint",
  "security_enforced",
  "select",
  "set",
  "sharing",
  "sort",
  "standard",
  "static",
  "super",
  "switch",
  "then",
  "tracking",
  "testmethod",
  "this",
  "throw",
  "transaction",
  "transient",
  "trigger",
  "try",
  "typeof",
  "undelete",
  "update",
  "upsert",
  "using",
  "virtual",
  "void",
  "webservice",
  "where",
  "when",
  "while",
  "with",
  "without"
]);

const APEX_CONSTANTS = new Set(["false", "null", "true"]);
const APEX_ANNOTATIONS = new Set([
  "auraenabled",
  "critical",
  "deprecated",
  "deserializable",
  "future",
  "httpdelete",
  "httpget",
  "httppatch",
  "httppost",
  "httpput",
  "invocablemethod",
  "invocablevariable",
  "isparallel",
  "istest",
  "jsonaccess",
  "jsonproperty",
  "namespaceaccessible",
  "remoteaction",
  "restresource",
  "serializable",
  "suppresswarnings",
  "testfor",
  "testsetup",
  "testvisible"
]);
const APEX_ANNOTATION_ATTRIBUTES = new Set([
  "cacheable",
  "callout",
  "configurationeditor",
  "continuation",
  "defaultvalue",
  "description",
  "iconname",
  "label",
  "namespaceaccessible",
  "oninstall",
  "placeholdertext",
  "readonly",
  "required",
  "scope",
  "seealldata",
  "urlmapping"
]);
const APEX_FUNCTIONS = new Set([
  "avg",
  "calendar_month",
  "calendar_quarter",
  "calendar_year",
  "convertcurrency",
  "converttimezone",
  "count",
  "count_distinct",
  "day_in_month",
  "day_in_week",
  "day_in_year",
  "day_only",
  "distance",
  "fiscal_month",
  "fiscal_quarter",
  "fiscal_year",
  "format",
  "geolocation",
  "grouping",
  "hour_in_day",
  "max",
  "min",
  "sum",
  "tolabel"
]);
const SYSTEM_TYPES = new Set([
  "blob",
  "boolean",
  "date",
  "datetime",
  "decimal",
  "double",
  "exception",
  "id",
  "integer",
  "list",
  "long",
  "map",
  "string",
  "time"
]);
const DECLARATION_KEYWORDS = new Set(["class", "enum", "interface", "trigger"]);
const XML_NAMESPACE_PREFIXES = new Set([
  "apex",
  "aura",
  "c",
  "design",
  "force",
  "lightning",
  "ltng",
  "template",
  "ui"
]);
const XML_TAG_NAMES = new Set([
  "apex:page",
  "apex:pageblock",
  "apex:outputtext",
  "aura:component",
  "aura:attribute",
  "lightning:card",
  "template",
  "customlabels",
  "permissionset",
  "flow",
  "profile",
  "customobjecttranslation"
]);
const XML_BOOLEAN_ATTRIBUTES = new Set(["checked", "disabled", "readonly", "required", "selected"]);

export function highlightSource(source, route) {
  if (route === "apex" || route === "apex-anonymous") {
    return highlightApex(source);
  }
  if (route === "markup" || route === "lwc-html" || route === "metadata-xml") {
    return highlightXmlLike(source);
  }
  return escapeHtml(source);
}

function highlightApex(source) {
  let index = 0;
  let html = "";
  let expectTypeDeclaration = false;
  let lastSignificant = null;

  const push = (className, text) => {
    html += `<span class="token ${className}">${escapeHtml(text)}</span>`;
  };
  const pushSignificant = (kind, text) => {
    lastSignificant = { kind, text };
  };

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (isWhitespace(char)) {
      html += char;
      index++;
      continue;
    }
    if (char === "/" && next === "/") {
      const end = readUntilLineEnd(source, index);
      push("comment", source.slice(index, end));
      index = end;
      continue;
    }
    if (char === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      const stop = end === -1 ? source.length : end + 2;
      push("comment", source.slice(index, stop));
      index = stop;
      continue;
    }
    if (char === "'") {
      const end = readApexString(source, index);
      push("string", source.slice(index, end));
      index = end;
      pushSignificant("string", "");
      continue;
    }
    if (isIdentifierStart(char)) {
      const end = readIdentifier(source, index);
      const word = source.slice(index, end);
      const lower = word.toLowerCase();
      const nextNonSpace = source[nextNonWhitespace(source, end)];
      const previous = lastSignificant;
      let kind = "identifier";

      if (expectTypeDeclaration) {
        kind = "type-declaration";
        expectTypeDeclaration = false;
      } else if (APEX_ANNOTATIONS.has(lower)) {
        kind = "annotation-name";
      } else if (APEX_ANNOTATION_ATTRIBUTES.has(lower) && isAnnotationAttribute(previous, nextNonSpace)) {
        kind = "annotation-attr";
      } else if (APEX_FUNCTIONS.has(lower) && nextNonSpace === "(") {
        kind = "method-call";
      } else if (APEX_KEYWORDS.has(lower)) {
        kind = lower === "select" || lower === "from" || lower === "where" ? "soql-keyword" : "keyword";
        expectTypeDeclaration = DECLARATION_KEYWORDS.has(lower);
      } else if (APEX_CONSTANTS.has(lower)) {
        kind = "constant";
      } else if (SYSTEM_TYPES.has(lower)) {
        kind = "system-type";
      } else if (/^[A-Za-z_][A-Za-z0-9_]*(?:__(?:c|r|x|mdt|e|b|kav))$/.test(word)) {
        kind = "sobject-field";
      } else if (previous?.text?.toLowerCase() === "from" && /^[A-Z][A-Za-z0-9_]*(?:__(?:c|mdt|e|b|kav))?$/.test(word)) {
        kind = "sobject-name";
      } else if (nextNonSpace === "(" && word[0] === word[0]?.toUpperCase()) {
        kind = "class-name";
      } else if (nextNonSpace === "(" && previous?.kind !== "dot") {
        kind = isMethodDeclaration(previous) ? "method-declaration" : "method-call";
      } else if (word[0] === word[0]?.toUpperCase()) {
        kind = "class-name";
      }

      push(kind, word);
      index = end;
      pushSignificant(kind, word);
      continue;
    }
    if (isDigit(char)) {
      const end = readNumber(source, index);
      push("number", source.slice(index, end));
      index = end;
      pushSignificant("number", "");
      continue;
    }
    if (char === ".") {
      push("dot", char);
      index++;
      pushSignificant("dot", char);
      continue;
    }
    if ("{}[]()".includes(char)) {
      push("bracket", char);
      index++;
      pushSignificant("bracket", char);
      continue;
    }
    if (",;".includes(char)) {
      push("punctuation", char);
      index++;
      pushSignificant("punctuation", char);
      continue;
    }
    const operator = readOperator(source, index);
    if (operator) {
      push("operator", operator);
      index += operator.length;
      pushSignificant("operator", operator);
      continue;
    }
    html += escapeHtml(char);
    index++;
  }
  return html;
}

function highlightXmlLike(source) {
  let html = "";
  let index = 0;

  while (index < source.length) {
    if (source.startsWith("<!--", index)) {
      const end = source.indexOf("-->", index + 4);
      const stop = end === -1 ? source.length : end + 3;
      html += `<span class="token comment">${escapeHtml(source.slice(index, stop))}</span>`;
      index = stop;
      continue;
    }
    if (source.startsWith("<![CDATA[", index)) {
      const end = source.indexOf("]]>", index + 9);
      const stop = end === -1 ? source.length : end + 3;
      html += `<span class="token string">${escapeHtml(source.slice(index, stop))}</span>`;
      index = stop;
      continue;
    }
    if (source[index] === "<") {
      const end = readTagEnd(source, index);
      const stop = end === -1 ? source.length : end + 1;
      html += highlightTag(source.slice(index, stop));
      index = stop;
      continue;
    }
    const next = source.indexOf("<", index);
    const stop = next === -1 ? source.length : next;
    html += escapeHtml(source.slice(index, stop));
    index = stop;
  }
  return html;
}

function highlightTag(tag) {
  if (tag.startsWith("<!")) {
    return `<span class="token comment">${escapeHtml(tag)}</span>`;
  }

  let index = 0;
  let html = "";
  const opening = tag.startsWith("</") ? "</" : "<";
  html += `<span class="token bracket">${escapeHtml(opening)}</span>`;
  index = opening.length;

  const nameStart = index;
  while (index < tag.length && /[A-Za-z0-9_:-]/.test(tag[index])) {
    index++;
  }
  const name = tag.slice(nameStart, index);
  html += `<span class="token ${readTagClass(name)}">${escapeHtml(name)}</span>`;

  while (index < tag.length) {
    const char = tag[index];
    if (char === "/" && tag[index + 1] === ">") {
      html += `<span class="token bracket">/&gt;</span>`;
      index += 2;
      continue;
    }
    if (char === ">") {
      html += `<span class="token bracket">&gt;</span>`;
      index++;
      continue;
    }
    if (isWhitespace(char)) {
      html += char;
      index++;
      continue;
    }
    if (isXmlNameStart(char)) {
      const attrStart = index;
      index++;
      while (index < tag.length && isXmlNamePart(tag[index])) {
        index++;
      }
      const attr = tag.slice(attrStart, index);
      const attrClass = XML_BOOLEAN_ATTRIBUTES.has(attr.toLowerCase()) ? "keyword" : "annotation-attr";
      html += `<span class="token ${attrClass}">${escapeHtml(attr)}</span>`;
      continue;
    }
    if (char === "=") {
      html += `<span class="token operator">=</span>`;
      index++;
      continue;
    }
    if (char === "\"" || char === "'") {
      const end = readQuotedString(tag, index);
      html += highlightXmlAttributeValue(tag.slice(index, end));
      index = end;
      continue;
    }
    if (!isWhitespace(char)) {
      const end = readUnquotedAttributeValue(tag, index);
      html += highlightXmlAttributeValue(tag.slice(index, end));
      index = end;
      continue;
    }
    html += escapeHtml(char);
    index++;
  }
  return html;
}

function readTagClass(name) {
  const lowerName = name.toLowerCase();
  const [prefix] = lowerName.split(":");
  if (XML_TAG_NAMES.has(lowerName) || XML_NAMESPACE_PREFIXES.has(prefix)) {
    return "tag-name";
  }
  return "class-name";
}

function highlightXmlAttributeValue(value) {
  if (!value.includes("{")) {
    return `<span class="token string">${escapeHtml(value)}</span>`;
  }
  let html = "";
  let index = 0;
  const quote = value[0];
  const isQuoted = quote === "\"" || quote === "'";
  const contentEnd = isQuoted ? value.length - 1 : value.length;
  if (isQuoted) {
    html += `<span class="token string">${escapeHtml(quote)}</span>`;
    index++;
  }
  while (index < contentEnd) {
    const formulaStart = value.indexOf("{!", index);
    const templateStart = value.indexOf("{", index);
    const nextStart = [formulaStart, templateStart].filter((next) => next !== -1).sort((a, b) => a - b)[0];
    if (nextStart === undefined || nextStart >= contentEnd) {
      html += `<span class="token string">${escapeHtml(value.slice(index, contentEnd))}</span>`;
      break;
    }
    if (nextStart > index) {
      html += `<span class="token string">${escapeHtml(value.slice(index, nextStart))}</span>`;
    }
    const close = value.indexOf("}", nextStart + 1);
    if (close === -1 || close >= contentEnd) {
      html += `<span class="token string">${escapeHtml(value.slice(nextStart, contentEnd))}</span>`;
      break;
    }
    const openerLength = value.startsWith("{!", nextStart) ? 2 : 1;
    html += `<span class="token bracket">${escapeHtml(value.slice(nextStart, nextStart + openerLength))}</span>`;
    html += highlightEmbeddedExpression(value.slice(nextStart + openerLength, close));
    html += `<span class="token bracket">}</span>`;
    index = close + 1;
  }
  if (isQuoted) {
    html += `<span class="token string">${escapeHtml(value.at(-1) === quote ? quote : "")}</span>`;
  }
  return html;
}

function highlightEmbeddedExpression(source) {
  let html = "";
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (/[A-Za-z_$]/.test(char)) {
      const start = index;
      index++;
      while (index < source.length && /[A-Za-z0-9_$]/.test(source[index])) {
        index++;
      }
      const word = source.slice(start, index);
      const lower = word.toLowerCase();
      if (["true", "false", "null"].includes(lower)) {
        html += `<span class="token keyword">${escapeHtml(word)}</span>`;
      } else if (["v", "c", "$label", "$resource"].includes(lower)) {
        html += `<span class="token constant">${escapeHtml(word)}</span>`;
      } else {
        html += `<span class="token identifier">${escapeHtml(word)}</span>`;
      }
      continue;
    }
    if (".[]()".includes(char)) {
      html += `<span class="token punctuation">${escapeHtml(char)}</span>`;
    } else {
      html += escapeHtml(char);
    }
    index++;
  }
  return html;
}

function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function readUntilLineEnd(source, start) {
  const end = source.indexOf("\n", start);
  return end === -1 ? source.length : end;
}

function readApexString(source, start) {
  let index = start + 1;
  while (index < source.length) {
    if (source[index] === "'" && source[index + 1] === "'") {
      index += 2;
      continue;
    }
    if (source[index] === "\\" && index + 1 < source.length) {
      index += 2;
      continue;
    }
    if (source[index] === "'") {
      return index + 1;
    }
    index++;
  }
  return source.length;
}

function readIdentifier(source, start) {
  let index = start;
  while (index < source.length && isIdentifierPart(source[index])) {
    index++;
  }
  return index;
}

function readNumber(source, start) {
  let index = start;
  while (index < source.length && /[0-9_]/.test(source[index])) {
    index++;
  }
  if (source[index] === "." && isDigit(source[index + 1])) {
    index++;
    while (index < source.length && /[0-9_]/.test(source[index])) {
      index++;
    }
  }
  return index;
}

function readOperator(source, start) {
  const three = source.slice(start, start + 3);
  if (["===", "!==", ">>>", "<<=", ">>="].includes(three)) {
    return three;
  }
  const two = source.slice(start, start + 2);
  if (["&&", "||", "++", "--", "==", "!=", "<=", ">=", "+=", "-=", "*=", "/=", "%=", "=>", "?.", "??"].includes(two)) {
    return two;
  }
  const one = source[start];
  return "+-*/%=!<>?:&|^~".includes(one) ? one : "";
}

function readTagEnd(source, start) {
  let quote = "";
  for (let index = start + 1; index < source.length; index++) {
    const char = source[index];
    if (quote) {
      if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }
    if (char === ">") {
      return index;
    }
  }
  return -1;
}

function readQuotedString(source, start) {
  const quote = source[start];
  let index = start + 1;
  while (index < source.length) {
    if (source[index] === quote) {
      return index + 1;
    }
    index++;
  }
  return source.length;
}

function readUnquotedAttributeValue(source, start) {
  let index = start;
  while (index < source.length && !isWhitespace(source[index]) && source[index] !== ">") {
    if (source[index] === "/" && source[index + 1] === ">") {
      break;
    }
    index++;
  }
  return index;
}

function nextNonWhitespace(source, start) {
  let index = start;
  while (index < source.length && isWhitespace(source[index])) {
    index++;
  }
  return index;
}

function isWhitespace(char) {
  return char === " " || char === "\t" || char === "\n" || char === "\r";
}

function isIdentifierStart(char) {
  return !!char && /[A-Za-z_]/.test(char);
}

function isIdentifierPart(char) {
  return !!char && /[A-Za-z0-9_]/.test(char);
}

function isDigit(char) {
  return !!char && /[0-9]/.test(char);
}

function isXmlNameStart(char) {
  return !!char && /[A-Za-z_:]/.test(char);
}

function isXmlNamePart(char) {
  return !!char && /[A-Za-z0-9_:.-]/.test(char);
}

function isAnnotationAttribute(previous, nextNonSpace) {
  return nextNonSpace === "=" || previous?.kind === "annotation-name" || previous?.text === "(" || previous?.text === ",";
}

function isMethodDeclaration(previous) {
  if (!previous) {
    return false;
  }
  if (["class-name", "system-type", "type-declaration"].includes(previous.kind)) {
    return true;
  }
  if (previous.kind === "operator" && previous.text === ">") {
    return true;
  }
  return previous.kind === "keyword" && previous.text.toLowerCase() === "void";
}
