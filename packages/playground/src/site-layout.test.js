import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(path.resolve(import.meta.dirname, "styles.css"), "utf8");

describe("site layout styles", () => {
  it("keeps documentation code blocks on their own horizontal scroll rail", () => {
    expect(styles).toContain(".site-shell pre");
    expect(styles).toContain("overflow-x: auto");
    expect(styles).toContain("overscroll-behavior-inline: contain");
    expect(styles).toContain("width: max-content");
    expect(styles).toContain("min-width: 100%");
  });

  it("has an explicit phone layout for the site and playground", () => {
    expect(styles).toContain("@media (max-width: 640px)");
    expect(styles).toContain(".site-header");
    expect(styles).toContain(".site-nav");
    expect(styles).toContain(".hero-section");
    expect(styles).toContain(".playground-shell");
    expect(styles).toContain(".pane-grid");
    expect(styles).toContain(".code-panel");
  });
});
