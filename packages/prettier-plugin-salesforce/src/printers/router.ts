import type { Printer } from "prettier";
import { builders } from "prettier/doc";
import { detectSalesforceMarkupDialect } from "../markup/parser.js";
import { formatSalesforceMarkup } from "../markup/printer.js";
import { formatXmlConservative } from "../xml/printer.js";
import type { SalesforceAst } from "../parsers/router.js";

const { hardline } = builders;

export const routerPrinter: Printer<SalesforceAst> = {
  embed(path, options) {
    const node = path.node as SalesforceAst;
    if (node.route !== "prettier-core") {
      return null;
    }
    const filepath = node.filepath?.toLowerCase() ?? "";
    const parser = prettierCoreParserForPath(filepath);
    if (parser === null) {
      return null;
    }
    return async (textToDoc) => {
      const delegatedOptions = { ...options, parser };
      return [await textToDoc(node.text, delegatedOptions), hardline];
    };
  },
  print(path, options) {
    if (path.node.route === "markup") {
      const dialect = detectSalesforceMarkupDialect(path.node.text);
      return formatSalesforceMarkup(path.node.text, dialect, true, options);
    }
    if (path.node.route === "lwc-html") {
      const dialect = detectSalesforceMarkupDialect(path.node.text);
      const applyTransforms = shouldApplyLwcHtmlTransforms(path.node.filepath, dialect);
      return formatSalesforceMarkup(path.node.text, dialect, applyTransforms, options);
    }

    if (path.node.route === "metadata-xml") {
      return formatXmlConservative(path.node.text, options);
    }

    return path.node.text.trimEnd() + "\n";
  }
};

function prettierCoreParserForPath(filepath: string): string | null {
  if (filepath.endsWith(".md") || filepath.endsWith(".mkd")) {
    return "markdown";
  }
  if (filepath.endsWith(".html")) {
    return "html";
  }
  return null;
}

function shouldApplyLwcHtmlTransforms(filepath: string | null, dialect: ReturnType<typeof detectSalesforceMarkupDialect>): boolean {
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
