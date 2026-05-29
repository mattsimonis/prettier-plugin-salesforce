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
  defaultOptions: {
    printWidth: 120,
  },
  options: {
    salesforceSortLabelsByFullName: {
      type: "boolean",
      category: "Salesforce",
      default: false,
      description:
        "Sort <labels> entries in .labels metadata files by nested <fullName> value.",
    },
    salesforceFinalNewline: {
      type: "boolean",
      category: "Salesforce",
      default: true,
      description:
        "Print one trailing newline at the end of Salesforce-formatted files.",
    },
    salesforceTestVisiblePlacement: {
      type: "choice",
      category: "Salesforce",
      default: "own-line",
      description:
        "Control whether @TestVisible prints on its own line or inline with the declaration.",
      choices: [
        {
          value: "own-line",
          description: "Print @TestVisible on its own line.",
        },
        {
          value: "inline",
          description: "Print @TestVisible inline with the declaration.",
        },
      ],
    },
    salesforceBlankLineBeforeLineComment: {
      type: "boolean",
      category: "Salesforce",
      default: false,
      description:
        "Print an empty line before standalone // comments, except as the first line inside a block.",
    },
    salesforceLogicalOperatorPosition: {
      type: "choice",
      category: "Salesforce",
      default: "end-of-line",
      description:
        "Control whether wrapped Apex && and || operators print at the end of a line or start of the next line.",
      choices: [
        {
          value: "end-of-line",
          description: "Print && and || at the end of the previous line.",
        },
        {
          value: "start-of-line",
          description: "Print && and || at the start of the next line.",
        },
      ],
    },
  },
  parsers: {
    "salesforce-apex": apexParser,
    "salesforce-apex-anonymous": anonymousApexParser,
    "salesforce-markup": salesforceMarkupParser,
    "salesforce-metadata-xml": metadataXmlParser,
    "salesforce-router": createParser("payload-text"),
    "salesforce-router-by-path": createPathAwareParser("unknown"),
  },
  printers: {
    "salesforce-apex-cst": apexPrinter,
    "salesforce-markup": salesforceMarkupPrinter,
    "salesforce-metadata-xml": metadataXmlPrinter,
    "salesforce-router": routerPrinter,
  },
};

export default plugin;
export { routeFile };
