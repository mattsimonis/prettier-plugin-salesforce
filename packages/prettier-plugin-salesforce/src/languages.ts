import type { SupportLanguage } from "prettier";
import {
  METADATA_XML_BASE_EXTENSIONS,
  METADATA_XML_BASE_FILENAMES,
  METADATA_XML_LANGUAGE_EXTENSIONS
} from "./metadata-families.js";
import { KNOWN_ANONYMOUS_APEX_BASENAMES } from "./shared/anonymous-apex.js";
import { PAYLOAD_TEXT_LANGUAGE_EXTENSIONS, PAYLOAD_TEXT_LANGUAGE_FILENAMES } from "./shared/payload-text.js";

export const languages: SupportLanguage[] = [
  {
    name: "Salesforce Apex",
    parsers: ["salesforce-apex"],
    extensions: [".cls", ".trigger"],
    vscodeLanguageIds: ["apex"]
  },
  {
    name: "Salesforce Anonymous Apex",
    parsers: ["salesforce-apex-anonymous"],
    extensions: [".apex"],
    filenames: [...KNOWN_ANONYMOUS_APEX_BASENAMES],
    vscodeLanguageIds: ["apex-anon"]
  },
  {
    name: "Salesforce Visualforce",
    parsers: ["salesforce-markup"],
    extensions: [".page", ".component"],
    vscodeLanguageIds: ["visualforce"]
  },
  {
    name: "Salesforce Routed App",
    parsers: ["salesforce-router-by-path"],
    extensions: [".app"],
    vscodeLanguageIds: ["auramarkup", "xml"]
  },
  {
    name: "Salesforce Aura Markup",
    parsers: ["salesforce-markup"],
    extensions: [".cmp", ".intf", ".tokens", ".evt", ".design", ".auradoc"],
    vscodeLanguageIds: ["auramarkup"]
  },
  {
    name: "Salesforce Routed HTML",
    parsers: ["salesforce-router-by-path"],
    extensions: [".html"],
    vscodeLanguageIds: ["html"]
  },
  {
    name: "Salesforce Routed Markdown",
    parsers: ["salesforce-router-by-path"],
    extensions: [".md"],
    vscodeLanguageIds: ["markdown"]
  },
  {
    name: "Salesforce Metadata XML",
    parsers: ["salesforce-metadata-xml"],
    extensions: [...METADATA_XML_BASE_EXTENSIONS, ...METADATA_XML_LANGUAGE_EXTENSIONS],
    filenames: [...METADATA_XML_BASE_FILENAMES],
    vscodeLanguageIds: ["xml"]
  },
  {
    name: "Salesforce Routed XML",
    parsers: ["salesforce-router-by-path"],
    extensions: [".xml"],
    vscodeLanguageIds: ["xml"]
  },
  {
    name: "Salesforce Payload Text",
    parsers: ["salesforce-router-by-path"],
    extensions: [...PAYLOAD_TEXT_LANGUAGE_EXTENSIONS],
    filenames: [...PAYLOAD_TEXT_LANGUAGE_FILENAMES],
    vscodeLanguageIds: ["plaintext"]
  }
];
