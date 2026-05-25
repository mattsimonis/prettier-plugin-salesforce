import { describe, expect, it } from "vitest";
import { parseApexWithWasm } from "./index.js";

describe("parseApexWithWasm", () => {
  it("returns a stable fallback parse result when wasm bundle is absent", async () => {
    await expect(parseApexWithWasm("public class Hello {}")).resolves.toEqual({
      root: {
        kind: "CompilationUnit",
        text: "public class Hello {}",
        startOffset: 0,
        endOffset: 21,
        children: [],
      },
      errors: [],
    });
  });

  it("keeps the same root/errors shape for empty input", async () => {
    await expect(parseApexWithWasm("")).resolves.toEqual({
      root: {
        kind: "CompilationUnit",
        text: "",
        startOffset: 0,
        endOffset: 0,
        children: [],
      },
      errors: [],
    });
  });
});
