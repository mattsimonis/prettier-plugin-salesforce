import { readFileSync } from "node:fs";
import prettier from "prettier";
import { describe, expect, test } from "vitest";
import plugin from "./index.js";
import { collectMetadataFixtureFilesSync } from "./metadata-fixture-files.js";
import { METADATA_XML_FAMILIES } from "./metadata-families.js";

describe("metadata family fixture runtime contract", () => {
  test("each metadata family has a runtime idempotence sample using a declared family extension", async () => {
    const failures: string[] = [];
    const allFixtures = collectMetadataFixtureFilesSync();

    for (const family of METADATA_XML_FAMILIES) {
      const candidates = listFamilySampleFiles(allFixtures, family.directory, [
        family.routingExtension,
        ...family.languageExtensions
      ]);

      if (candidates.length === 0) {
        failures.push(`${family.directory}\tno-sample-for-declared-extensions`);
        continue;
      }

      const samplePath = candidates[0];
      const source = readFileSync(samplePath, "utf8");
      const once = await prettier.format(source, { filepath: samplePath, plugins: [plugin] });
      const twice = await prettier.format(once, { filepath: samplePath, plugins: [plugin] });

      if (!once.endsWith("\n")) {
        failures.push(`${family.directory}\tmissing-trailing-newline\t${samplePath}`);
      }
      if (twice !== once) {
        failures.push(`${family.directory}\tnon-idempotent\t${samplePath}`);
      }
    }

    expect(failures, `Metadata family fixture runtime contract failures:\n${failures.join("\n")}`).toEqual([]);
  });
});

function listFamilySampleFiles(
  fixtures: Array<{ absolutePath: string; relativePath: string }>,
  familyDirectory: string,
  extensions: string[]
): string[] {
  const expected = new Set(extensions.map((extension) => extension.toLowerCase()));
  const familyPrefix = `${familyDirectory.toLowerCase()}/`;

  return fixtures
    .filter((file) => file.relativePath.toLowerCase().startsWith(familyPrefix))
    .map((file) => file.absolutePath)
    .filter((filepath) => {
      const normalized = filepath.replaceAll("\\", "/").toLowerCase();
      return [...expected].some((suffix) => normalized.endsWith(suffix));
    })
    .sort((a, b) => a.localeCompare(b));
}
