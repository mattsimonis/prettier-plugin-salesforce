import { describe, expect, test } from "vitest";
import { METADATA_XML_FAMILIES } from "./metadata-families.js";
import { metadataCanonicalFamilyFromPath } from "./metadata-family-routing.js";

const EXCLUDED_NON_META_SUFFIXES = new Set([
  ".xml",
  ".iml",
  ".meta.xml",
  ".resource-meta.xml",
  ".asset-meta.xml",
  ".package.xml",
  ".ruleset.xml"
]);

describe("metadata generated sidecar suffix contract", () => {
  test("declared metadata extensions map to canonical families via generated meta.xml suffixes", () => {
    const failures: string[] = [];

    for (const family of METADATA_XML_FAMILIES) {
      const extensions = [family.routingExtension, ...family.languageExtensions].map((value) => value.toLowerCase());
      for (const extension of extensions) {
        if (EXCLUDED_NON_META_SUFFIXES.has(extension)) {
          continue;
        }
        const metaSuffix = toMetaXmlSuffix(extension);
        if (!metaSuffix) {
          continue;
        }
        if (metaSuffix === ".js-meta.xml" || metaSuffix === ".app-meta.xml") {
          continue;
        }

        const samplePath = `/tmp/out/${family.directory}/Sample${metaSuffix}`;
        const actual = metadataCanonicalFamilyFromPath(samplePath);
        if (actual !== family.directory) {
          failures.push(`${metaSuffix}\t${family.directory}\tactual=${actual ?? "null"}`);
        }
      }
    }

    expect(failures, `Generated sidecar suffix mapping failures:\n${failures.join("\n")}`).toEqual([]);
  });

  test("ambiguous .js-meta.xml resolves by path context", () => {
    expect(metadataCanonicalFamilyFromPath("/tmp/out/aura/Sample.js-meta.xml")).toBe("auradefinitionbundles");
    expect(metadataCanonicalFamilyFromPath("/tmp/out/lwc/Sample.js-meta.xml")).toBe("lightningcomponentbundles");
  });

  test("ambiguous .app-meta.xml resolves by path context", () => {
    expect(metadataCanonicalFamilyFromPath("/tmp/out/aura/Sample.app-meta.xml")).toBe("auradefinitionbundles");
    expect(metadataCanonicalFamilyFromPath("/tmp/out/applications/Sample.app-meta.xml")).toBe("applications");
  });
});

function toMetaXmlSuffix(extension: string): string | null {
  if (!extension.startsWith(".")) {
    return null;
  }
  if (extension.endsWith("-meta.xml")) {
    return extension;
  }
  if (extension.endsWith(".xml")) {
    return null;
  }
  return `${extension}-meta.xml`;
}
