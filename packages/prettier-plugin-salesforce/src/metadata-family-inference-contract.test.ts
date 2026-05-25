import prettier from "prettier";
import { describe, expect, it } from "vitest";
import plugin from "./index.js";
import { METADATA_XML_FAMILIES } from "./metadata-families.js";

describe("metadata family inference contract", () => {
  it("formats each metadata family directory and extension with inferred parser", async () => {
    for (const family of METADATA_XML_FAMILIES) {
      for (const extension of [family.routingExtension, ...family.languageExtensions]) {
        const filepath = `/tmp/force-app/main/default/${family.directory}/Sample${extension}`;
        const once = await prettier.format("<Metadata><label>X</label></Metadata>", { filepath, plugins: [plugin] });
        const twice = await prettier.format(once, { filepath, plugins: [plugin] });

        expect(once.length).toBeGreaterThan(0);
        expect(once.endsWith("\n")).toBe(true);
        expect(twice).toBe(once);
      }
    }
  });

  it("formats each metadata family alias directory with inferred parser", async () => {
    for (const family of METADATA_XML_FAMILIES) {
      for (const alias of family.routingDirectoryAliases) {
        const filepath = `/tmp/force-app/main/default/${alias}/Sample${family.routingExtension}`;
        const once = await prettier.format("<Metadata><label>X</label></Metadata>", { filepath, plugins: [plugin] });
        const twice = await prettier.format(once, { filepath, plugins: [plugin] });

        expect(once.length).toBeGreaterThan(0);
        expect(once.endsWith("\n")).toBe(true);
        expect(twice).toBe(once);
      }
    }
  });
});
