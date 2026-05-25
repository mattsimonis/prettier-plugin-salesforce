import "../../run-spec.js";
import path from "node:path";
import { readFile } from "node:fs/promises";
import prettier from "prettier";
import { describe, expect, it } from "vitest";
import plugin from "../../../src/index.js";

runSpec(import.meta.dirname, ["salesforce-markup"]);

describe("lwc html path inference boundary", () => {
  it("formats weak-signal fixture only when filepath matches lwc component path", async () => {
    const fixturePath = path.join(import.meta.dirname, "WeakSignalPathInference.html");
    const source = await readFile(fixturePath, "utf8");

    const formattedAsLwc = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/lwc/weakSignalPathInference/weakSignalPathInference.html",
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    const formattedAsPlainHtml = await prettier.format(source, {
      filepath: "/tmp/site/partials/weakSignalPathInference.html",
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formattedAsLwc).toBe("<section>\n  <span>{value}</span>\n</section>\n");
    expect(formattedAsPlainHtml).toBe("<section><span>{value}</span></section>\n");
  });
});
