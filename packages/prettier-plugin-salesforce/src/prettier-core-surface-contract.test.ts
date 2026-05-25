import prettier from "prettier";
import { describe, expect, it } from "vitest";
import { PRETTIER_CORE_DATA_EXTENSIONS, PRETTIER_CORE_PROJECT_CODE_EXTENSIONS } from "./shared/prettier-core.js";

function toLowerSet(values: readonly string[]): Set<string> {
  return new Set(values.map((value) => value.toLowerCase()));
}

describe("prettier-core extension registry contract", () => {
  it("keeps declared prettier-core extensions aligned with prettier support info", async () => {
    const info = await prettier.getSupportInfo({ showDeprecated: true });
    const coreExtensions = new Set<string>();

    for (const language of info.languages) {
      for (const extension of language.extensions ?? []) {
        coreExtensions.add(extension.toLowerCase());
      }
    }

    const declared = toLowerSet([...PRETTIER_CORE_DATA_EXTENSIONS, ...PRETTIER_CORE_PROJECT_CODE_EXTENSIONS]);
    const unknown = [...declared].filter((extension) => !coreExtensions.has(extension)).sort((a, b) =>
      a.localeCompare(b)
    );

    expect(unknown, `Declared prettier-core extensions not found in support info:\n${unknown.join("\n")}`).toEqual([]);
  });
});
