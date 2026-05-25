import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import prettier from "prettier";
import plugin from "./index.js";

const APPLICATION_APP = "tests/metadata/applications/Console.app";
const AURA_APP = "/tmp/force-app/main/default/aura/Widget/Widget.app";

describe(".app ambiguity contract", () => {
  test(".app infers path-aware router parser", async () => {
    const appInfo = await prettier.getFileInfo(APPLICATION_APP, { plugins: [plugin] });
    const auraInfo = await prettier.getFileInfo(AURA_APP, { plugins: [plugin] });

    expect(appInfo.inferredParser).toBe("salesforce-router-by-path");
    expect(auraInfo.inferredParser).toBe("salesforce-router-by-path");
  });

  test("applications/*.app inferred output matches explicit metadata parser output", async () => {
    const source = readFileSync(APPLICATION_APP, "utf8");
    const inferred = await prettier.format(source, { filepath: APPLICATION_APP, plugins: [plugin] });
    const explicitMetadata = await prettier.format(source, {
      filepath: APPLICATION_APP,
      plugins: [plugin],
      parser: "salesforce-metadata-xml"
    });
    const secondPass = await prettier.format(inferred, { filepath: APPLICATION_APP, plugins: [plugin] });

    expect(inferred).toBe(explicitMetadata);
    expect(secondPass).toBe(inferred);
  });

  test("aura/*.app inferred output matches explicit markup parser output", async () => {
    const source = "<aura:application><aura:text value=\"Hi\"/></aura:application>\n";
    const inferred = await prettier.format(source, { filepath: AURA_APP, plugins: [plugin] });
    const explicitMarkup = await prettier.format(source, {
      filepath: AURA_APP,
      plugins: [plugin],
      parser: "salesforce-markup"
    });
    const secondPass = await prettier.format(inferred, { filepath: AURA_APP, plugins: [plugin] });

    expect(inferred).toBe(explicitMarkup);
    expect(secondPass).toBe(inferred);
  });
});
