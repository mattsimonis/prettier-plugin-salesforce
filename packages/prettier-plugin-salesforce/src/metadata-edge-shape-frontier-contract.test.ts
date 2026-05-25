import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { METADATA_XML_FAMILY_DIRECTORIES } from "./metadata-families.js";

const FIXTURE_ROOT = join(process.cwd(), "tests", "metadata");
const SPEC_FILE_NAME = "jsfmt.spec.ts";

// Families without SiblingRisk* fixture coverage yet.
// Keep this explicit so behavior-hardening movement is visible.
const EXPECTED_MISSING_EDGE_SHAPE_FAMILIES = [
  // Frontier closed: every declared metadata family has at least one SiblingRisk* fixture.
].sort();

describe("metadata edge-shape frontier contract", () => {
  test("keeps missing edge-shape fixture frontier explicit by family", () => {
    const missing: string[] = [];

    for (const family of METADATA_XML_FAMILY_DIRECTORIES) {
      const fixtureDir = findFamilyFixtureDir(family);
      if (!fixtureDir) {
        missing.push(family);
        continue;
      }

      const hasSiblingRiskFixture = readdirSync(fixtureDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name !== SPEC_FILE_NAME)
        .some((entry) => /^SiblingRisk/i.test(entry.name));

      if (!hasSiblingRiskFixture) {
        missing.push(family);
      }
    }

    expect(missing.sort()).toEqual(EXPECTED_MISSING_EDGE_SHAPE_FAMILIES);
  });

  test("requires a SiblingRiskMixed* fixture per metadata family", () => {
    const missing: string[] = [];

    for (const family of METADATA_XML_FAMILY_DIRECTORIES) {
      const fixtureDir = findFamilyFixtureDir(family);
      if (!fixtureDir) {
        missing.push(family);
        continue;
      }

      const hasMixedFixture = readdirSync(fixtureDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name !== SPEC_FILE_NAME)
        .some((entry) => /^SiblingRiskMixed/i.test(entry.name));

      if (!hasMixedFixture) {
        missing.push(family);
      }
    }

    expect(missing, `Missing SiblingRiskMixed fixtures by family:\n${missing.join("\n")}`).toEqual([]);
  });
});

function findFamilyFixtureDir(family: string): string | null {
  const entries = readdirSync(FIXTURE_ROOT, { withFileTypes: true });
  const match = entries.find(
    (entry) => entry.isDirectory() && entry.name.toLowerCase() === family.toLowerCase()
  );
  return match ? join(FIXTURE_ROOT, match.name) : null;
}
