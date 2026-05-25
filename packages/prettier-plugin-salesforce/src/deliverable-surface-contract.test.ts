import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const PACKAGE_ROOT = path.resolve(import.meta.dirname, "..");
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "..", "..");

const SURFACE_ROOTS = [
  path.join(PACKAGE_ROOT, "src"),
  path.join(PACKAGE_ROOT, "tests"),
  path.join(REPO_ROOT, "docs"),
  path.join(REPO_ROOT, "README.md")
];

const SCANNED_EXTENSIONS = new Set([".ts", ".js", ".md", ".json"]);
const FORBIDDEN_FRAGMENTS = [process.env.HOME].filter((value): value is string => typeof value === "string" && value.length > 0);

describe("deliverable surface contract", () => {
  test("keeps local machine paths and deprecated corpus naming out of deliverable surfaces", () => {
    const violations: string[] = [];
    const files = collectSurfaceFiles(SURFACE_ROOTS);
    const selfPath = path.resolve(import.meta.dirname, "deliverable-surface-contract.test.ts");

    for (const filePath of files) {
      if (path.resolve(filePath) === selfPath) {
        continue;
      }
      const source = readFileSync(filePath, "utf8");
      for (const forbidden of FORBIDDEN_FRAGMENTS) {
        if (!source.includes(forbidden)) {
          continue;
        }
        const relative = path.relative(REPO_ROOT, filePath).replaceAll("\\", "/");
        violations.push(`${relative}\tcontains=${forbidden}`);
      }
    }

    expect(violations, `Forbidden path/name fragments found:\n${violations.join("\n")}`).toEqual([]);
  });
});

function collectSurfaceFiles(roots: string[]): string[] {
  const out: string[] = [];
  for (const root of roots) {
    if (!statExists(root)) {
      continue;
    }
    const stats = statSync(root);
    if (stats.isFile()) {
      out.push(root);
      continue;
    }
    walk(root, out);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

function walk(dir: string, out: string[]): void {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") {
      continue;
    }
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(filePath, out);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (!SCANNED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }
    out.push(filePath);
  }
}

function statExists(targetPath: string): boolean {
  try {
    statSync(targetPath);
    return true;
  } catch {
    return false;
  }
}
