import type { Parser } from "prettier";
import {
  isMetadataFamilyPathWithAllowedExtension,
  metadataFamilyDirectoryFromPath
} from "../metadata-family-routing.js";
import { extractRootTagLocalName, KNOWN_SALESFORCE_METADATA_ROOT_TAGS } from "./salesforce-metadata-root-tags.js";

export type MetadataXmlDocument = {
  kind: "metadata-xml";
  source: string;
  applyMetadataTransforms: boolean;
};

export const metadataXmlParser: Parser<MetadataXmlDocument> = {
  astFormat: "salesforce-metadata-xml",
  parse: (source, options) => {
    const filepath = getFilepathFromOptions(options);
    return {
      kind: "metadata-xml",
      source,
      applyMetadataTransforms: shouldApplyMetadataTransforms(source, filepath)
    };
  },
  locStart: () => 0,
  locEnd: (node) => node.source.length
};

function shouldApplyMetadataTransforms(source: string, filepath: string | null): boolean {
  if (!filepath) {
    return true;
  }

  if (isSalesforceMetadataPath(filepath)) {
    return true;
  }

  if (!isSalesforceSourceTreePath(filepath) && hasKnownSalesforceMetadataRootTag(source)) {
    return true;
  }

  return false;
}

function isSalesforceMetadataPath(filepath: string): boolean {
  const normalized = filepath.replaceAll("\\", "/").toLowerCase();
  if (normalized.endsWith("-meta.xml") || normalized.endsWith("-meta.xml.tmp") || normalized.endsWith(".labels")) {
    return true;
  }
  if (isSalesforceManifestPath(normalized)) {
    return true;
  }

  if (metadataFamilyDirectoryFromPath(normalized)) {
    return isMetadataFamilyPathWithAllowedExtension(normalized);
  }

  return false;
}

function isSalesforceManifestPath(normalizedLowerPath: string): boolean {
  if (normalizedLowerPath.endsWith("/package.xml")) {
    return (
      normalizedLowerPath.includes("/manifest/") ||
      normalizedLowerPath.includes("/unpackaged/") ||
      normalizedLowerPath.includes("/destructivechanges/") ||
      normalizedLowerPath.includes("/destructive/") ||
      normalizedLowerPath.includes("/src/")
    );
  }
  if (normalizedLowerPath.endsWith("/destructivechanges.xml")) {
    return (
      normalizedLowerPath.includes("/manifest/") ||
      normalizedLowerPath.includes("/unpackaged/") ||
      normalizedLowerPath.includes("/destructivechanges/") ||
      normalizedLowerPath.includes("/destructive/")
    );
  }
  return false;
}

function getFilepathFromOptions(options: unknown): string | null {
  if (!options || typeof options !== "object") {
    return null;
  }

  const candidate = (options as { filepath?: unknown }).filepath;
  return typeof candidate === "string" ? candidate : null;
}

function hasKnownSalesforceMetadataRootTag(source: string): boolean {
  const rootLocalName = extractRootTagLocalName(source);
  if (!rootLocalName) {
    return false;
  }

  return KNOWN_SALESFORCE_METADATA_ROOT_TAGS.has(rootLocalName.toLowerCase());
}

function isSalesforceSourceTreePath(filepath: string): boolean {
  const normalized = filepath.replaceAll("\\", "/").toLowerCase();
  return (
    normalized.includes("/force-app/") ||
    normalized.includes("/sfdx-source/") ||
    normalized.includes("/unpackaged/") ||
    normalized.includes("/src/")
  );
}
