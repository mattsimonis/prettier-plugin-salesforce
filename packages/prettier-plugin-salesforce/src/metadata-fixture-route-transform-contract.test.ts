import { describe, expect, test } from "vitest";
import { collectMetadataFixtureFilesSync } from "./metadata-fixture-files.js";
import { routeFile } from "./routing.js";
import { metadataXmlParser } from "./xml/parser.js";

describe("metadata fixture route/transform contract", () => {
  test("all metadata fixtures route to metadata-xml and keep metadata transforms enabled", () => {
    const fixtureFiles = collectMetadataFixtureFilesSync();
    const failures: string[] = [];

    for (const file of fixtureFiles) {
      const route = routeFile(file.absolutePath);
      if (route !== "metadata-xml") {
        failures.push(`${file.relativePath}\troute=${route}`);
        continue;
      }

      const parsed = metadataXmlParser.parse("<Metadata/>", { filepath: file.absolutePath } as never);
      if (!parsed.applyMetadataTransforms) {
        failures.push(`${file.relativePath}\tapplyMetadataTransforms=false`);
      }
    }

    expect(failures, `Metadata fixture route/transform failures:\n${failures.join("\n")}`).toEqual([]);
  });
});
