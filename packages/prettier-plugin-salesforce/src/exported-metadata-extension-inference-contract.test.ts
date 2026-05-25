import prettier from "prettier";
import { describe, expect, it } from "vitest";
import plugin from "./index.js";
import { METADATA_XML_FAMILIES } from "./metadata-families.js";
import { metadataCanonicalFamilyFromKnownExtension } from "./metadata-family-routing.js";
import { routeFile } from "./routing.js";

type ExportedExtensionCase = {
  extension: string;
  family: string;
  filepath: string;
};

const EXPORTED_EXTENSION_CASES = buildExportedExtensionCases();

describe("exported metadata extension inference contract", () => {
  it("keeps generated exported metadata extension cases non-empty", () => {
    expect(EXPORTED_EXTENSION_CASES.length).toBeGreaterThan(0);
  });

  it("routes generated exported metadata extension cases to metadata-xml", () => {
    const failures: string[] = [];
    for (const testCase of EXPORTED_EXTENSION_CASES) {
      const route = routeFile(testCase.filepath);
      if (route !== "metadata-xml") {
        failures.push(`${testCase.extension}\t${testCase.family}\troute=${route}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("infers metadata parser for generated exported metadata extension cases", async () => {
    const failures: string[] = [];
    const source = "<MetadataEnvelope><name>sample</name></MetadataEnvelope>";

    for (const testCase of EXPORTED_EXTENSION_CASES) {
      const info = await prettier.getFileInfo(testCase.filepath, { plugins: [plugin] });
      const inferred = info.inferredParser;
      const expectedParser = testCase.extension === ".md" ? "salesforce-router-by-path" : "salesforce-metadata-xml";
      if (inferred !== expectedParser) {
        failures.push(`${testCase.extension}\t${testCase.family}\tinferred=${inferred ?? "<null>"}`);
        continue;
      }

      const once = await prettier.format(source, { filepath: testCase.filepath, plugins: [plugin] });
      const twice = await prettier.format(once, { filepath: testCase.filepath, plugins: [plugin] });
      if (once !== twice) {
        failures.push(`${testCase.extension}\t${testCase.family}\tnon-idempotent`);
      }
    }

    expect(failures).toEqual([]);
  });

  it("routes and infers metadata parser for generated exported sidecar suffixes", async () => {
    const failures: string[] = [];
    const source = "<MetadataEnvelope><name>sample</name></MetadataEnvelope>";

    for (const testCase of EXPORTED_EXTENSION_CASES) {
      const sidecarPath = `/tmp/exports/Sample${toMetaXmlSuffix(testCase.extension)}`;
      const route = routeFile(sidecarPath);
      if (route !== "metadata-xml") {
        failures.push(`${testCase.extension}\tsidecar-route=${route}`);
        continue;
      }

      const info = await prettier.getFileInfo(sidecarPath, { plugins: [plugin] });
      const inferred = info.inferredParser;
      if (inferred !== "salesforce-metadata-xml") {
        failures.push(`${testCase.extension}\tsidecar-inferred=${inferred ?? "<null>"}`);
        continue;
      }

      const once = await prettier.format(source, { filepath: sidecarPath, plugins: [plugin] });
      const twice = await prettier.format(once, { filepath: sidecarPath, plugins: [plugin] });
      if (once !== twice) {
        failures.push(`${testCase.extension}\tsidecar-non-idempotent`);
      }
    }

    expect(failures).toEqual([]);
  });

  it("routes generated relative exported metadata extension cases to metadata-xml", () => {
    const failures: string[] = [];
    for (const testCase of EXPORTED_EXTENSION_CASES) {
      const relativePath = `exports/Sample${testCase.extension}`;
      const route = routeFile(relativePath);
      if (route !== "metadata-xml") {
        failures.push(`${testCase.extension}\t${testCase.family}\troute=${route}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("infers metadata parser for generated relative exported metadata extension cases", async () => {
    const failures: string[] = [];
    const source = "<MetadataEnvelope><name>sample</name></MetadataEnvelope>";

    for (const testCase of EXPORTED_EXTENSION_CASES) {
      const relativePath = `exports/Sample${testCase.extension}`;
      const info = await prettier.getFileInfo(relativePath, { plugins: [plugin] });
      const inferred = info.inferredParser;
      const expectedParser = testCase.extension === ".md" ? "salesforce-router-by-path" : "salesforce-metadata-xml";
      if (inferred !== expectedParser) {
        failures.push(`${testCase.extension}\t${testCase.family}\tinferred=${inferred ?? "<null>"}`);
        continue;
      }

      const once = await prettier.format(source, { filepath: relativePath, plugins: [plugin] });
      const twice = await prettier.format(once, { filepath: relativePath, plugins: [plugin] });
      if (once !== twice) {
        failures.push(`${testCase.extension}\t${testCase.family}\tnon-idempotent`);
      }
    }

    expect(failures).toEqual([]);
  });

  it("keeps non-metadata exported files off metadata parser inference", async () => {
    const cases = [
      { filepath: "/tmp/exports/README.md" },
      { filepath: "/tmp/exports/config.json" },
      { filepath: "/tmp/exports/script.ts" }
    ] as const;

    for (const testCase of cases) {
      expect(routeFile(testCase.filepath)).toBe("prettier-core");
      expect(metadataCanonicalFamilyFromKnownExtension(testCase.filepath)).toBeNull();
    }
  });
});

function buildExportedExtensionCases(): ExportedExtensionCase[] {
  const seen = new Set<string>();
  const out: ExportedExtensionCase[] = [];

  for (const family of METADATA_XML_FAMILIES) {
    const extensions = [family.routingExtension, ...family.languageExtensions]
      .map((value) => value.toLowerCase())
      .filter((value, index, all) => all.indexOf(value) === index);

    for (const extension of extensions) {
      const filepath = `/tmp/exports/Sample${extension}`;
      const inferredFamily = metadataCanonicalFamilyFromKnownExtension(filepath);
      if (inferredFamily !== family.directory) {
        continue;
      }
      const key = `${extension}\t${family.directory}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push({
        extension,
        family: family.directory,
        filepath
      });
    }
  }

  out.sort((left, right) => {
    const extensionCompare = left.extension.localeCompare(right.extension);
    if (extensionCompare !== 0) {
      return extensionCompare;
    }
    return left.family.localeCompare(right.family);
  });

  return out;
}

function toMetaXmlSuffix(extension: string): string {
  if (extension.endsWith("-meta.xml")) {
    return extension;
  }
  if (extension.endsWith(".xml")) {
    return extension;
  }
  return `${extension}-meta.xml`;
}
