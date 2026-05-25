import type { Plugin } from "prettier";
import { anonymousApexParser, apexParser } from "./apex/parser.js";
import { apexPrinter } from "./apex/printer.js";
import { languages } from "./languages.js";
import { salesforceMarkupParser } from "./markup/parser.js";
import { salesforceMarkupPrinter } from "./markup/printer.js";
import { createParser, createPathAwareParser } from "./parsers/router.js";
import { routerPrinter } from "./printers/router.js";
import { routeFile } from "./routing.js";
import { metadataXmlParser } from "./xml/parser.js";
import { metadataXmlPrinter } from "./xml/printer.js";

export const plugin: Plugin = {
  languages,
  options: {
    salesforceSortLabelsByFullName: {
      type: "boolean",
      category: "Salesforce",
      default: false,
      description: "Sort <labels> entries in .labels metadata files by nested <fullName> value."
    },
    salesforceSortLabelEntriesByFullName: {
      type: "boolean",
      category: "Salesforce",
      default: false,
      description: "Deprecated alias for salesforceSortLabelsByFullName."
    }
  },
  parsers: {
    "salesforce-apex": apexParser,
    "salesforce-apex-anonymous": anonymousApexParser,
    "salesforce-markup": salesforceMarkupParser,
    "salesforce-metadata-xml": metadataXmlParser,
    "salesforce-router": createParser("payload-text"),
    "salesforce-router-by-path": createPathAwareParser("unknown")
  },
  printers: {
    "salesforce-apex-cst": apexPrinter,
    "salesforce-markup": salesforceMarkupPrinter,
    "salesforce-metadata-xml": metadataXmlPrinter,
    "salesforce-router": routerPrinter
  }
};

export default plugin;
export { routeFile };
