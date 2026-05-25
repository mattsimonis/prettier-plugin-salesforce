import { describe, expect, test } from "vitest";
import { collectMetadataFixtureDirectoriesSync } from "./metadata-fixture-files.js";
import { METADATA_XML_FAMILY_DIRECTORIES } from "./metadata-families.js";

const TEMPORARY_UNBACKED_FAMILY_ALLOWLIST = new Set<string>();

describe("metadata fixture coverage contract", () => {
  test("each metadata family has a matching fixture directory or explicit temporary allowlist", () => {
    const fixtureDirectories = collectMetadataFixtureDirectoriesSync();

    const missingFamilies = METADATA_XML_FAMILY_DIRECTORIES.filter((family) => {
      const normalized = family.toLowerCase();
      return !fixtureDirectories.has(normalized) && !TEMPORARY_UNBACKED_FAMILY_ALLOWLIST.has(normalized);
    }).sort();

    expect(
      missingFamilies,
      `Missing fixture directories for metadata families:\n${missingFamilies.join("\n")}`
    ).toEqual([]);
  });
});
