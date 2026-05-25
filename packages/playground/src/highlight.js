const APEX_KEYWORDS = new Set([
  "abstract",
  "after",
  "as",
  "before",
  "break",
  "catch",
  "class",
  "commit",
  "continue",
  "delete",
  "do",
  "else",
  "enum",
  "extends",
  "final",
  "finally",
  "for",
  "get",
  "global",
  "if",
  "implements",
  "in",
  "inherited",
  "insert",
  "instanceof",
  "interface",
  "merge",
  "new",
  "override",
  "private",
  "protected",
  "public",
  "return",
  "set",
  "sharing",
  "static",
  "super",
  "switch",
  "testmethod",
  "this",
  "throw",
  "transaction",
  "transient",
  "trigger",
  "try",
  "undelete",
  "update",
  "upsert",
  "virtual",
  "void",
  "webservice",
  "when",
  "while",
  "with",
  "without"
]);

const APEX_CONSTANTS = new Set(["false", "null", "true"]);
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
  "object",
  "set",
  "sobject",
  "string",
  "time"
]);
const DECLARATION_KEYWORDS = new Set(["class", "enum", "interface", "trigger"]);
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
      } else if (APEX_KEYWORDS.has(lower)) {
        kind = "keyword";
        expectTypeDeclaration = DECLARATION_KEYWORDS.has(lower);
      } else if (APEX_CONSTANTS.has(lower)) {
        kind = "constant";
      } else if (SYSTEM_TYPES.has(lower)) {
        kind = "system-type";
      } else if (nextNonSpace === "=" && /^[A-Z][A-Za-z0-9_]*(?:__c|__r)?$/.test(word)) {
        kind = "sobject-field";
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
    if (source[index] === "<") {
      const end = source.indexOf(">", index + 1);
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
  return escapeHtml(tag).replace(
    /(&lt;\/?)([A-Za-z_][A-Za-z0-9_:-]*)([^&]*?)(&gt;)/g,
    (_, open, name, rest, close) => {
      const tagClass = XML_TAG_NAMES.has(name.toLowerCase()) ? "tag-name" : "class-name";
      const attrs = rest.replace(/([A-Za-z_:][A-Za-z0-9_:.-]*)(=)(&quot;.*?&quot;|'.*?')/g, (_m, attr, eq, value) => {
        return `<span class="token annotation-attr">${attr}</span><span class="token operator">${eq}</span><span class="token string">${value}</span>`;
      });
      return `<span class="token bracket">${open}</span><span class="token ${tagClass}">${name}</span>${attrs}<span class="token bracket">${close}</span>`;
    }
  );
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
