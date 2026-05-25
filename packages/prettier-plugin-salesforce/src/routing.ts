import {
  isMetadataFamilyPathWithAllowedExtension,
  metadataCanonicalFamilyFromKnownExtension,
  metadataCanonicalFamilyFromPath
} from "./metadata-family-routing.js";
import { KNOWN_ANONYMOUS_APEX_BASENAMES } from "./shared/anonymous-apex.js";
import {
  AGENTFORCE_AUTHORING_TEXT_EXTENSIONS,
  KNOWN_TEXT_BASENAMES,
  PAYLOAD_TEXT_EXTENSIONS,
  STATICRESOURCE_PAYLOAD_TEXT_EXTENSIONS
} from "./shared/payload-text.js";
import {
  PRETTIER_CORE_DATA_EXTENSIONS,
  PRETTIER_CORE_PROJECT_CODE_EXTENSIONS,
  PRETTIER_CORE_STATICRESOURCE_EXTENSIONS
} from "./shared/prettier-core.js";

export type SalesforceRoute =
  | "apex"
  | "apex-anonymous"
  | "markup"
  | "lwc-html"
  | "metadata-xml"
  | "payload-text"
  | "prettier-core"
  | "unknown";

const VISUALFORCE_EXTENSIONS = new Set([".page", ".component"]);
const AURA_MARKUP_EXTENSIONS = new Set([".cmp", ".intf", ".tokens", ".evt", ".design", ".auradoc"]);
const AURA_APP_EXTENSION = ".app";

const PAYLOAD_TEXT_EXTENSION_SET: Set<string> = new Set(PAYLOAD_TEXT_EXTENSIONS);
const PRETTIER_CORE_EXTENSIONS: Set<string> = new Set(PRETTIER_CORE_DATA_EXTENSIONS);
const STATICRESOURCE_PRETTIER_CORE_EXTENSIONS: Set<string> = new Set(PRETTIER_CORE_STATICRESOURCE_EXTENSIONS);
const STATICRESOURCE_PAYLOAD_TEXT_EXTENSION_SET: Set<string> = new Set(STATICRESOURCE_PAYLOAD_TEXT_EXTENSIONS);
const PROJECT_CODE_PRETTIER_CORE_EXTENSIONS: Set<string> = new Set(PRETTIER_CORE_PROJECT_CODE_EXTENSIONS);
const KNOWN_TEXT_BASENAME_SET: Set<string> = new Set(KNOWN_TEXT_BASENAMES);
const KNOWN_ANONYMOUS_APEX_BASENAME_SET: Set<string> = new Set(
  KNOWN_ANONYMOUS_APEX_BASENAMES.map((basename) => basename.toLowerCase())
);
const AGENTFORCE_AUTHORING_TEXT_EXTENSION_SET: Set<string> = new Set(AGENTFORCE_AUTHORING_TEXT_EXTENSIONS);

export function routeFile(filePath: string): SalesforceRoute {
  const normalized = filePath.replaceAll("\\", "/");
  const normalizedLower = normalized.toLowerCase();
  const extension = extnameLower(normalizedLower);
  const basenameLower = basenameLowerOf(normalizedLower);
  const pathFamily = metadataCanonicalFamilyFromPath(normalizedLower);
  const inIdea = hasPathSegment(normalizedLower, ".idea");
  const inNodeModules = hasPathSegment(normalizedLower, "node_modules");

  // Keep editor and dependency XML off Salesforce metadata routing.
  // Exception: sfdx-workspace.iml remains metadata-aware for Salesforce IDE workspaces.
  if ((inIdea || inNodeModules) && (extension === ".xml" || extension === ".iml")) {
    if (basenameLower === "sfdx-workspace.iml") {
      return "metadata-xml";
    }
    if (basenameLower !== "sfdx-workspace.iml") {
      return "prettier-core";
    }
  }

  if (
    extension === ".md" &&
    pathFamily === "custommetadata" &&
    isDocsLikeMarkdownBasename(basenameLower)
  ) {
    return "prettier-core";
  }

  if (extension === ".cls" || extension === ".trigger") {
    return "apex";
  }
  if (extension === ".apex") {
    return "apex-anonymous";
  }
  if (extension.length === 0 && KNOWN_ANONYMOUS_APEX_BASENAME_SET.has(basenameLower)) {
    return "apex-anonymous";
  }
  if (normalizedLower.endsWith(".xml.tmp")) {
    return "metadata-xml";
  }
  if (normalizedLower.endsWith("-meta.xml")) {
    return "metadata-xml";
  }
  if (extension === ".labels") {
    return "metadata-xml";
  }
  if (isMetadataFamilyPathWithAllowedExtension(normalizedLower)) {
    return "metadata-xml";
  }

  if (VISUALFORCE_EXTENSIONS.has(extension)) {
    return "markup";
  }
  if (AURA_MARKUP_EXTENSIONS.has(extension)) {
    return "markup";
  }
  if (extension === AURA_APP_EXTENSION && hasPathSegment(normalizedLower, "aura")) {
    return "markup";
  }
  if (extension === AURA_APP_EXTENSION && pathFamily === "applications") {
    return "metadata-xml";
  }
  if (hasPathSegment(normalizedLower, "lwc") && extension === ".html") {
    return "lwc-html";
  }
  if (hasPathSegment(normalizedLower, "lwc") && extension === ".svg") {
    return "payload-text";
  }
  if (hasPathSegment(normalizedLower, "lwc") && [".js", ".ts", ".css"].includes(extension)) {
    return "prettier-core";
  }
  if (hasPathSegment(normalizedLower, "aura") && extension === ".svg") {
    return "payload-text";
  }
  if (hasPathSegment(normalizedLower, "aura") && [".js", ".css"].includes(extension)) {
    return "prettier-core";
  }
  if (
    extension === ".md" &&
    !isLikelySalesforceSourcePath(normalizedLower) &&
    pathFamily === "custommetadata"
  ) {
    return "metadata-xml";
  }
  if (!isLikelySalesforceSourcePath(normalizedLower) && metadataCanonicalFamilyFromKnownExtension(normalizedLower) !== null) {
    return "metadata-xml";
  }
  if (
    (hasPathSegment(normalizedLower, "aiauthoringbundles") || hasPathSegment(normalizedLower, "genaiplannerbundles")) &&
    AGENTFORCE_AUTHORING_TEXT_EXTENSION_SET.has(extension)
  ) {
    return "payload-text";
  }
  if (hasPathSegment(normalizedLower, "staticresources") || hasPathSegment(normalizedLower, "staticresourcesources")) {
    if (STATICRESOURCE_PRETTIER_CORE_EXTENSIONS.has(extension)) {
      return "prettier-core";
    }
    if (extension === ".svg") {
      return "payload-text";
    }
    if (STATICRESOURCE_PAYLOAD_TEXT_EXTENSION_SET.has(extension)) {
      return "payload-text";
    }
  }
  if (pathFamily !== null && extension === ".xml") {
    return "metadata-xml";
  }
  if (PAYLOAD_TEXT_EXTENSION_SET.has(extension)) {
    return "payload-text";
  }
  if (KNOWN_TEXT_BASENAME_SET.has(basenameLower)) {
    return "payload-text";
  }
  if (PROJECT_CODE_PRETTIER_CORE_EXTENSIONS.has(extension)) {
    return "prettier-core";
  }
  if (PRETTIER_CORE_EXTENSIONS.has(extension)) {
    return "prettier-core";
  }
  return "unknown";
}

function isDocsLikeMarkdownBasename(basenameLower: string): boolean {
  const stem = basenameLower.endsWith(".md") ? basenameLower.slice(0, -3) : basenameLower;
  return DOCS_LIKE_MARKDOWN_BASENAMES.has(stem);
}

const DOCS_LIKE_MARKDOWN_BASENAMES = new Set([
  "readme",
  "changelog",
  "release",
  "releases",
  "notes",
  "guide",
  "guides",
  "docs",
  "documentation"
]);

function hasPathSegment(normalizedLowerPath: string, segment: string): boolean {
  return (
    normalizedLowerPath.startsWith(`${segment}/`) ||
    normalizedLowerPath.includes(`/${segment}/`)
  );
}

function isLikelySalesforceSourcePath(normalizedLowerPath: string): boolean {
  return (
    normalizedLowerPath.includes("/force-app/main/default/") ||
    normalizedLowerPath.includes("/sfdx-source/") ||
    normalizedLowerPath.includes("/src/")
  );
}

function basenameLowerOf(normalizedLowerPath: string): string {
  const idx = normalizedLowerPath.lastIndexOf("/");
  if (idx === -1) {
    return normalizedLowerPath;
  }
  return normalizedLowerPath.slice(idx + 1);
}

function extnameLower(normalizedLowerPath: string): string {
  const basename = basenameLowerOf(normalizedLowerPath);
  const idx = basename.lastIndexOf(".");
  if (idx <= 0) {
    return "";
  }
  return basename.slice(idx);
}
