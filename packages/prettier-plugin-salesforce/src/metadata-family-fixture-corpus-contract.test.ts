import { describe, expect, test } from "vitest";
import { METADATA_XML_FAMILIES } from "./metadata-families.js";
import { collectMetadataFixtureFilesSync, type MetadataFixtureFile } from "./metadata-fixture-files.js";
import { routeFile } from "./routing.js";

describe("metadata family fixture corpus contract", () => {
  test("fixture corpus exposes at least one routed metadata sample per declared family", () => {
    const files = collectMetadataFixtureFilesSync();
    const byFamily = new Map<string, MetadataFixtureFile[]>();

    for (const file of files) {
      const family = file.relativePath.split("/")[0].toLowerCase();
      const route = routeFile(file.absolutePath);
      if (route !== "metadata-xml") {
        continue;
      }

      const existing = byFamily.get(family) ?? [];
      existing.push(file);
      byFamily.set(family, existing);
    }

    const missing: string[] = [];
    for (const family of METADATA_XML_FAMILIES) {
      const samples = byFamily.get(family.directory);
      if (!samples || samples.length === 0) {
        missing.push(family.directory);
      }
    }

    expect(missing, `Missing routed metadata fixture corpus families:\n${missing.join("\n")}`).toEqual([]);
  });

  test("fixture corpus has no non-metadata-routed files under declared family directories", () => {
    const files = collectMetadataFixtureFilesSync();
    const knownFamilies = new Set(METADATA_XML_FAMILIES.map((family) => family.directory));
    const failures: string[] = [];

    for (const file of files) {
      const family = file.relativePath.split("/")[0].toLowerCase();
      if (!knownFamilies.has(family)) {
        continue;
      }
      const route = routeFile(file.absolutePath);
      if (route !== "metadata-xml") {
        failures.push(`${file.relativePath}\troute=${route}`);
      }
    }

    expect(failures, `Non-metadata routed files inside declared family fixtures:\n${failures.join("\n")}`).toEqual([]);
  });
});
