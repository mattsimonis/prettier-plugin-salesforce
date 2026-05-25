import { readFileSync } from "node:fs";
import prettier from "prettier";
import { describe, expect, test } from "vitest";
import plugin from "./index.js";
import { METADATA_XML_FAMILY_DIRECTORIES } from "./metadata-families.js";
import { collectMetadataFixtureFilesSync } from "./metadata-fixture-files.js";
import { routeFile } from "./routing.js";

describe("metadata fixture full runtime contract", () => {
  test("keeps every metadata fixture file route-aligned and idempotent", async () => {
    const files = collectMetadataFixtureFilesSync().filter((file) => {
      const family = file.relativePath.split("/")[0].toLowerCase();
      return METADATA_XML_FAMILY_DIRECTORIES.includes(family);
    });

    const failures: string[] = [];
    for (const file of files) {
      const route = routeFile(file.absolutePath);
      if (route !== "metadata-xml") {
        failures.push(`${file.relativePath}\troute=${route}`);
        continue;
      }

      const source = readFileSync(file.absolutePath, "utf8");
      try {
        const once = await prettier.format(source, {
          filepath: file.absolutePath,
          parser: "salesforce-metadata-xml",
          plugins: [plugin]
        });
        const twice = await prettier.format(once, {
          filepath: file.absolutePath,
          parser: "salesforce-metadata-xml",
          plugins: [plugin]
        });

        if (!once.endsWith("\n")) {
          failures.push(`${file.relativePath}\tmissing-trailing-newline`);
        }
        if (once !== twice) {
          failures.push(`${file.relativePath}\tnon-idempotent`);
        }
      } catch (error) {
        failures.push(`${file.relativePath}\terror\t${String(error).split("\n")[0]}`);
      }
    }

    expect(failures, `Metadata fixture full runtime failures:\n${failures.join("\n")}`).toEqual([]);
  }, 180_000);
});
