import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const evidenceDir = path.resolve(repoRoot, ".release-evidence");
const benchRoot = path.resolve(repoRoot, process.env.SF_PRETTIER_BENCH_ROOT ?? "packages/prettier-plugin-salesforce/tests");
const benchmarkJson = path.join(evidenceDir, "benchmark.json");

mkdirSync(evidenceDir, { recursive: true });

run("pnpm", ["build"]);
run("pnpm", ["--filter", "@prettier-salesforce/benchmarks", "test"]);
run("pnpm", ["--filter", "prettier-plugin-salesforce", "test"]);
run("pnpm", ["lint"]);
verifyPack();
run("pnpm", [
  "--filter",
  "@prettier-salesforce/benchmarks",
  "bench",
  benchRoot,
  "--plugin",
  "--release",
  `--json-out=${benchmarkJson}`
]);

function verifyPack() {
  const result = run("pnpm", ["--filter", "prettier-plugin-salesforce", "exec", "npm", "pack", "--dry-run", "--json"], {
    capture: true
  });
  const pack = parsePackJson(result.stdout);
  const files = new Set(pack.files.map((file) => file.path));
  const requiredFiles = [
    "package.json",
    "README.md",
    "LICENSE",
    "dist/index.js",
    "dist/index.d.ts",
    "dist/browser.js",
    "dist/browser.d.ts",
    "dist/config-audit-cli.js",
    "dist/config-audit-cli.d.ts"
  ];

  for (const file of requiredFiles) {
    if (!files.has(file)) {
      throw new Error(`npm pack is missing ${file}`);
    }
  }

  const manifest = JSON.parse(readFileSync(path.join(repoRoot, "packages", "prettier-plugin-salesforce", "package.json"), "utf8"));
  for (const exportPath of [".", "./browser", "./audit", "./config-audit", "./config-audit/scan", "./config-audit/cli", "./package.json"]) {
    if (!manifest.exports || !(exportPath in manifest.exports)) {
      throw new Error(`package exports is missing ${exportPath}`);
    }
  }
}

function parsePackJson(stdout) {
  const trimmed = stdout.trim();
  const jsonStart = trimmed.indexOf("[");
  if (jsonStart === -1) {
    throw new Error(`Could not parse npm pack JSON:\n${stdout}`);
  }
  const parsed = JSON.parse(trimmed.slice(jsonStart));
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`npm pack JSON had no package entries:\n${stdout}`);
  }
  return parsed[0];
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: options.capture === true ? ["ignore", "pipe", "pipe"] : "inherit"
  });

  if (result.status !== 0) {
    if (options.capture === true) {
      process.stdout.write(result.stdout ?? "");
      process.stderr.write(result.stderr ?? "");
    }
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}`);
  }
  return result;
}
