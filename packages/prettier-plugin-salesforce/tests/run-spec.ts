import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import prettier from "prettier";
import { describe, expect, it } from "vitest";
import plugin from "../src/index.js";

declare global {
  var runSpec: (fixtureDir: string, parsers: string[]) => void;
}

globalThis.runSpec = (fixtureDir: string, parsers: string[]): void => {
  const parser = parsers[0];

  describe(path.relative(process.cwd(), fixtureDir), () => {
    it(`formats fixtures with ${parser}`, async () => {
      const entries = await readdir(fixtureDir, { withFileTypes: true });
      const files = entries.filter((entry) => entry.isFile() && !entry.name.endsWith(".spec.ts"));

      expect(files.length).toBeGreaterThan(0);
      for (const file of files) {
        const filePath = path.join(fixtureDir, file.name);
        const source = await readFile(filePath, "utf8");
        const once = await prettier.format(source, { filepath: filePath, parser, plugins: [plugin] });
        const twice = await prettier.format(once, { filepath: filePath, parser, plugins: [plugin] });

        expect(once.endsWith("\n")).toBe(true);
        expect(twice).toEqual(once);
      }
    });
  });
};

export {};
