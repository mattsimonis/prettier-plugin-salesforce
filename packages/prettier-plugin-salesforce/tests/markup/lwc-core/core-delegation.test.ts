import { readFile } from "node:fs/promises";
import path from "node:path";
import prettier from "prettier";
import { describe, expect, it } from "vitest";
import plugin from "../../../src/index.js";

describe("LWC core delegation", () => {
  it.each(["widget.js", "widget.css"])("formats %s through Prettier core with the plugin loaded", async (name) => {
    const filePath = path.join(import.meta.dirname, name);
    const source = await readFile(filePath, "utf8");
    const once = await prettier.format(source, { filepath: filePath, plugins: [plugin] });
    const twice = await prettier.format(once, { filepath: filePath, plugins: [plugin] });

    expect(twice).toEqual(once);
  });
});
