import { describe, expect, test } from "vitest";
import { collectMetadataFixtureFilesSync } from "./metadata-fixture-files.js";
import { routeFile } from "./routing.js";

describe("metadata fixture route contract", () => {
  test("every metadata fixture file routes to metadata-xml", () => {
    const fixtureFiles = collectMetadataFixtureFilesSync();
    const mismatches = fixtureFiles
      .map((file) => {
        const route = routeFile(file.absolutePath);
        return {
          route,
          relativePath: file.relativePath
        };
      })
      .filter((item) => item.route !== "metadata-xml")
      .sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    const mismatchReport = mismatches.map((item) => `${item.route} ${item.relativePath}`).join("\n");

    expect(mismatches, `Non metadata-xml routed fixtures:\n${mismatchReport}`).toEqual([]);
  });
});
