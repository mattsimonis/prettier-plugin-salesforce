import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PACKAGE_ROOT = path.resolve(import.meta.dirname, "..");
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "..", "..");

describe("package surface contract", () => {
  it("exports the node plugin, browser plugin, audit entrypoint, and package metadata", () => {
    const manifest = readPackageJson();

    expect(manifest.exports).toEqual({
      ".": { types: "./dist/index.d.ts", import: "./dist/index.js", default: "./dist/index.js" },
      "./browser": { types: "./dist/browser.d.ts", import: "./dist/browser.js" },
      "./audit": { types: "./dist/config-audit-cli.d.ts", import: "./dist/config-audit-cli.js" },
      "./config-audit": { types: "./dist/config-audit.d.ts", import: "./dist/config-audit.js" },
      "./config-audit/scan": { types: "./dist/config-audit-scan.d.ts", import: "./dist/config-audit-scan.js" },
      "./config-audit/cli": { types: "./dist/config-audit-cli.d.ts", import: "./dist/config-audit-cli.js" },
      "./package.json": "./package.json"
    });
  });

  it("uses the Prettier doc subpath and named builders export", () => {
    const routerSource = readFileSync(path.join(PACKAGE_ROOT, "src", "printers", "router.ts"), "utf8");

    expect(routerSource).toContain('import prettierDoc from "prettier/doc.js"');
    expect(routerSource).not.toContain('from "prettier/doc"');
  });

  it("keeps config audit parser dependencies available at runtime", () => {
    const manifest = readPackageJson();

    expect(manifest.dependencies).toMatchObject({
      "@iarna/toml": expect.any(String),
      json5: expect.any(String),
      yaml: expect.any(String)
    });
  });

  it("publishes package docs and license text with release metadata", () => {
    const manifest = readPackageJson();

    expect(manifest.version).not.toBe("0.0.0");
    expect(manifest.files).toEqual(expect.arrayContaining(["dist", "README.md", "LICENSE"]));
    expect(manifest.license).toBeTruthy();
    expect(manifest.repository).toBeTruthy();
    expect(manifest.homepage).toBeTruthy();
    expect(manifest.bugs).toBeTruthy();
    expect(readFileSync(path.join(PACKAGE_ROOT, "README.md"), "utf8")).toContain("prettier-plugin-salesforce");
    expect(readFileSync(path.join(PACKAGE_ROOT, "LICENSE"), "utf8").trim().length).toBeGreaterThan(0);
  });

  it("keeps the default plugin entrypoint free of config-audit exports", () => {
    const indexSource = readFileSync(path.join(PACKAGE_ROOT, "src", "index.ts"), "utf8");

    expect(indexSource).not.toContain("config-audit");
  });

  it("marks the stub wasm parser workspace package private", () => {
    const manifest = JSON.parse(readFileSync(path.join(REPO_ROOT, "packages", "apex-parser-wasm", "package.json"), "utf8")) as {
      private?: boolean;
    };

    expect(manifest.private).toBe(true);
  });
});

function readPackageJson(): {
  exports?: unknown;
  dependencies?: Record<string, string>;
  files?: string[];
  license?: string;
  repository?: unknown;
  homepage?: string;
  bugs?: unknown;
  version?: string;
} {
  return JSON.parse(readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8")) as {
    exports?: unknown;
    dependencies?: Record<string, string>;
    files?: string[];
    license?: string;
    repository?: unknown;
    homepage?: string;
    bugs?: unknown;
    version?: string;
  };
}
