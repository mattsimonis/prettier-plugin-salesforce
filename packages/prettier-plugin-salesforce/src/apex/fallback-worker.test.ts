import { describe, expect, it } from "vitest";
import { parseWithFallbackWorker } from "./fallback-worker.js";

describe("parseWithFallbackWorker", () => {
  it("parses class-or-trigger mode and passes id and diagnostics through", async () => {
    const source = "public class Hello { void run(){ if ((true) { } }";
    const response = await parseWithFallbackWorker({
      id: "req-1",
      mode: "class-or-trigger",
      path: "/tmp/Hello.cls",
      source
    });

    expect(response.id).toBe("req-1");
    expect(response.ok).toBe(true);
    expect(response.document?.mode).toBe("class-or-trigger");
    expect(response.diagnostics).toEqual(response.document?.diagnostics);
    expect(response.diagnostics?.some((item) => item.code === "APEX_PAREN_UNMATCHED_OPEN")).toBe(true);
  });

  it("parses anonymous mode and sets anonymous document mode", async () => {
    const response = await parseWithFallbackWorker({
      id: "req-2",
      mode: "anonymous",
      path: "/tmp/anon.apex",
      source: "Integer a = 1; System.debug(a);"
    });

    expect(response.id).toBe("req-2");
    expect(response.ok).toBe(true);
    expect(response.document?.mode).toBe("anonymous");
    expect(response.diagnostics).toEqual(response.document?.diagnostics);
  });
});
