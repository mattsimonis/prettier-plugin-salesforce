import prettier from "prettier";
import path from "node:path";
import { describe, expect, test } from "vitest";
import plugin from "./index.js";
import { collectMetadataFixtureFilesSync } from "./metadata-fixture-files.js";
import { routeFile } from "./routing.js";

describe("metadata fixture inference surface contract", () => {
  test("keeps inferred parser aligned for all metadata fixture files", async () => {
    const fixtures = collectMetadataFixtureFilesSync();
    const failures: string[] = [];

    for (const fixture of fixtures) {
      const route = routeFile(fixture.absolutePath);
      if (route !== "metadata-xml") {
        failures.push(`${fixture.relativePath}\troute=${route}`);
        continue;
      }

      const expectedParser = expectedInferredParserForFixture(fixture.relativePath);
      const info = await prettier.getFileInfo(fixture.absolutePath, { plugins: [plugin] });
      if (info.inferredParser !== expectedParser) {
        failures.push(
          `${fixture.relativePath}\tinferred=${String(info.inferredParser)}\texpected=${expectedParser}`
        );
      }
    }

    expect(failures, `Metadata fixture inference mismatches:\n${failures.join("\n")}`).toEqual([]);
  });
});

function expectedInferredParserForFixture(relativePath: string): string {
  const extension = path.extname(relativePath).toLowerCase();
  if (extension === ".app" || extension === ".md") {
    return "salesforce-router-by-path";
  }
  return "salesforce-metadata-xml";
}
