import { readFileSync } from "node:fs";
import prettier from "prettier";
import { describe, expect, test } from "vitest";
import plugin from "./index.js";
import { collectMetadataFixtureFilesSync } from "./metadata-fixture-files.js";

const METADATA_PARSER = "salesforce-metadata-xml";

function isAmbiguousApplicationApp(relativePath: string): boolean {
  return relativePath.startsWith("applications/") && relativePath.toLowerCase().endsWith(".app");
}

function isAmbiguousCustomMetadataMarkdown(relativePath: string): boolean {
  return relativePath.startsWith("customMetadata/") && relativePath.toLowerCase().endsWith(".md");
}

describe("metadata fixture inference contract", () => {
  test("every metadata fixture is metadata-equivalent under inferred parser and idempotent", async () => {
    const fixtureFiles = collectMetadataFixtureFilesSync();
    const failures: string[] = [];

    for (const file of fixtureFiles) {
      const relativePath = file.relativePath;
      const source = readFileSync(file.absolutePath, "utf8");
      const fileInfo = await prettier.getFileInfo(file.absolutePath, { plugins: [plugin] });
      const inferredParser = fileInfo.inferredParser;

      const explicitMetadataFormatted = await prettier.format(source, {
        filepath: file.absolutePath,
        plugins: [plugin],
        parser: METADATA_PARSER
      });

      if (inferredParser !== METADATA_PARSER) {
        if (
          isAmbiguousApplicationApp(relativePath) &&
          (inferredParser === "salesforce-markup" || inferredParser === "salesforce-router-by-path")
        ) {
          const inferredFormatted = await prettier.format(source, { filepath: file.absolutePath, plugins: [plugin] });

          if (inferredFormatted !== explicitMetadataFormatted) {
            failures.push(`${relativePath} ambiguous-app-output-mismatch`);
            continue;
          }
        } else if (isAmbiguousCustomMetadataMarkdown(relativePath) && inferredParser === "salesforce-router-by-path") {
          const inferredFormatted = await prettier.format(source, { filepath: file.absolutePath, plugins: [plugin] });

          if (inferredFormatted !== explicitMetadataFormatted) {
            failures.push(`${relativePath} ambiguous-custommetadata-md-output-mismatch`);
            continue;
          }
        } else {
          failures.push(`${relativePath} inferredParser=${inferredParser ?? "null"}`);
          continue;
        }
      }

      const formatted = await prettier.format(source, { filepath: file.absolutePath, plugins: [plugin] });
      if (formatted !== explicitMetadataFormatted) {
        failures.push(`${relativePath} inferred-explicit-metadata-output-mismatch`);
      }
      if (!formatted.endsWith("\n")) {
        failures.push(`${relativePath} missing-trailing-newline`);
      }

      const secondPass = await prettier.format(formatted, { filepath: file.absolutePath, plugins: [plugin] });
      if (secondPass !== formatted) {
        failures.push(`${relativePath} non-idempotent`);
      }
    }

    expect(failures, `Metadata inference/format contract failures:\n${failures.join("\n")}`).toEqual([]);
  });
});
