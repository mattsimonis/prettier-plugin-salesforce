import { describe, expect, test } from "vitest";
import { collectMetadataFixtureDirectoriesSync, collectMetadataFixtureFilesSync } from "./metadata-fixture-files.js";
import { METADATA_XML_FAMILY_DIRECTORIES } from "./metadata-families.js";

const MIN_FIXTURES_PER_FAMILY = 2;

describe("metadata fixture depth contract", () => {
  test(`each metadata family directory has at least ${MIN_FIXTURES_PER_FAMILY} fixture files`, () => {
    const fixtureDirectories = collectMetadataFixtureDirectoriesSync();
    const fixtureFiles = collectMetadataFixtureFilesSync();
    const countsByFamily = new Map<string, number>();
    for (const file of fixtureFiles) {
      const family = file.relativePath.split("/")[0]?.toLowerCase();
      if (!family) {
        continue;
      }
      countsByFamily.set(family, (countsByFamily.get(family) ?? 0) + 1);
    }

    const missingDirectories = METADATA_XML_FAMILY_DIRECTORIES.filter(
      (family) => !fixtureDirectories.has(family.toLowerCase())
    ).sort();
    expect(missingDirectories, `Missing fixture directories:\n${missingDirectories.join("\n")}`).toEqual([]);

    const underfilled: string[] = [];
    for (const family of METADATA_XML_FAMILY_DIRECTORIES) {
      const fixtureCount = countsByFamily.get(family) ?? 0;
      if (fixtureCount < MIN_FIXTURES_PER_FAMILY) {
        underfilled.push(`${family}\t${fixtureCount}`);
      }
    }

    expect(underfilled, `Underfilled fixture families (family\\tcount):\n${underfilled.join("\n")}`).toEqual([]);
  });
});
