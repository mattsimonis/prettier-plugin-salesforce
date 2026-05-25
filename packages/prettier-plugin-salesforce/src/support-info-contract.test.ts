import prettier from "prettier";
import { describe, expect, it } from "vitest";
import plugin from "./index.js";
import { languages } from "./languages.js";

describe("support info contract", () => {
  it("exposes every plugin language through prettier.getSupportInfo()", async () => {
    const info = await prettier.getSupportInfo({ plugins: [plugin], showDeprecated: true });
    const infoByName = new Map(info.languages.map((language) => [language.name, language]));

    const missing: string[] = [];
    for (const language of languages) {
      if (!infoByName.has(language.name)) {
        missing.push(language.name);
      }
    }

    expect(missing, `Plugin languages missing from getSupportInfo:\n${missing.join("\n")}`).toEqual([]);
  });

  it("keeps declared parser names resolvable via plugin parser registry", () => {
    const parserRegistry = new Set(Object.keys(plugin.parsers ?? {}));
    const missing: string[] = [];

    for (const language of languages) {
      for (const parserName of language.parsers ?? []) {
        if (!parserRegistry.has(parserName)) {
          missing.push(`${language.name}\t${parserName}`);
        }
      }
    }

    expect(missing, `Declared parser names missing from plugin.parsers:\n${missing.join("\n")}`).toEqual([]);
  });
});
