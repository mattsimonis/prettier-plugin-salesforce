import { readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { METADATA_XML_ROUTING_DIRECTORIES } from "./metadata-families.js";

const metadataFixtureRoot = path.join(import.meta.dirname, "..", "tests", "metadata");
const NON_FAMILY_FIXTURE_DIRECTORIES = new Set(["basic"]);

describe("metadata routing directory contract", () => {
  it("keeps metadata fixture directories covered by routing directories", async () => {
    const fixtureDirectories = await listFixtureDirectories(metadataFixtureRoot);
    const routed = new Set(METADATA_XML_ROUTING_DIRECTORIES);

    const uncovered = fixtureDirectories
      .map((directory) => directory.toLowerCase())
      .filter((directory) => !NON_FAMILY_FIXTURE_DIRECTORIES.has(directory))
      .filter((directory) => !routed.has(directory))
      .sort((a, b) => a.localeCompare(b));

    expect(uncovered).toEqual([]);
  });
});

async function listFixtureDirectories(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}
