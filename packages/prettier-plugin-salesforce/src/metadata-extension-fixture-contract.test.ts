import { describe, expect, test } from "vitest";
import { languages } from "./languages.js";
import { collectMetadataFixtureFilesSync } from "./metadata-fixture-files.js";
const BASE_XML_EXTENSIONS = new Set([".xml", ".iml", "-meta.xml", ".xml.tmp"]);
const METADATA_LANGUAGE_NAME = "Salesforce Metadata XML";

function collectFixturePaths(): string[] {
  return collectMetadataFixtureFilesSync()
    .map((file) => file.absolutePath.replaceAll("\\", "/").toLowerCase())
    .sort((a, b) => a.localeCompare(b));
}

describe("metadata extension fixture contract", () => {
  test("every metadata language extension has a matching fixture extension, excluding base xml-like extensions", () => {
    const metadataLanguage = languages.find((language) => language.name === METADATA_LANGUAGE_NAME);
    expect(metadataLanguage).toBeDefined();

    const declaredExtensions = new Set(
      (metadataLanguage?.extensions ?? [])
        .map((extension) => extension.toLowerCase())
        .filter((extension) => !BASE_XML_EXTENSIONS.has(extension))
    );
    const fixturePaths = collectFixturePaths();

    const missingExtensions = [...declaredExtensions]
      .filter((extension) => !fixturePaths.some((filepath) => filepath.endsWith(extension)))
      .sort();

    expect(
      missingExtensions,
      `Missing metadata fixture extensions:\n${missingExtensions.join("\n")}`
    ).toEqual([]);
  });
});
