import { readFileSync } from "node:fs";
import prettier from "prettier";
import { describe, expect, test } from "vitest";
import { collectCorpus } from "../../benchmarks/src/collect-corpus.js";
import plugin from "./index.js";
import { METADATA_XML_FAMILIES } from "./metadata-families.js";
import { collectMetadataFixturePathsSync, METADATA_FIXTURE_ROOT } from "./metadata-fixture-files.js";
import { routeFile } from "./routing.js";

const METADATA_PARSER = "salesforce-metadata-xml";

describe("metadata fixture parser equivalence contract", () => {
  test("collector classifies all metadata fixture files as xml and covers every family", async () => {
    const fixtureFiles = collectMetadataFixturePathsSync().filter(
      (filepath) => routeFile(filepath) === "metadata-xml"
    );
    const collected = await collectCorpus(METADATA_FIXTURE_ROOT, routeFile);
    const collectedMetadata = collected.filter(
      (entry) => routeFile(entry.path) === "metadata-xml" && entry.family === "xml"
    );

    const fixtureSet = new Set(fixtureFiles);
    const collectedSet = new Set(collectedMetadata.map((entry) => entry.path));

    const missingFromCollector = [...fixtureSet]
      .filter((filepath) => !collectedSet.has(filepath))
      .map((filepath) => filepath.slice(filepath.indexOf("/tests/metadata/") + 1))
      .sort();
    expect(missingFromCollector).toEqual([]);
    expect([...collectedSet].every((filepath) => fixtureSet.has(filepath))).toBe(true);

    const coveredFamilies = new Set(
      collectedMetadata.map((entry) => entry.path.replaceAll("\\", "/").split("/").at(-2)?.toLowerCase() ?? "")
    );

    const missingFamilies = METADATA_XML_FAMILIES
      .map((family) => family.directory)
      .filter((family) => !coveredFamilies.has(family))
      .sort();
    expect(
      missingFamilies,
      `Missing families in collected metadata fixtures:\n${missingFamilies.join("\n")}`
    ).toEqual([]);
  });

  test("inferred parser output matches explicit metadata parser output for every metadata fixture", async () => {
    const fixtureFiles = collectMetadataFixturePathsSync().filter(
      (filepath) => routeFile(filepath) === "metadata-xml"
    );
    const mismatches: string[] = [];

    for (const filepath of fixtureFiles) {
      const source = readFileSync(filepath, "utf8");
      const inferred = await prettier.format(source, { filepath, plugins: [plugin] });
      const explicit = await prettier.format(source, { filepath, parser: METADATA_PARSER, plugins: [plugin] });

      if (inferred !== explicit) {
        mismatches.push(filepath);
      }
    }

    expect(
      mismatches,
      `Inferred parser output diverges from explicit metadata parser output:\n${mismatches.join("\n")}`
    ).toEqual([]);
  }, 120_000);
});
