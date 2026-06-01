import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const mainSource = readFileSync(path.resolve(import.meta.dirname, "main.js"), "utf8");

describe("playground pages routing", () => {
  it("uses hash navigation so GitHub Pages refreshes stay on the static index", () => {
    expect(mainSource).toContain('window.addEventListener("hashchange", mountRoute)');
    expect(mainSource).toContain('href="#playground"');
    expect(mainSource).not.toContain("window.history.pushState");
  });
});
