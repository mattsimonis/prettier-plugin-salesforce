import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
import JSON5 from "json5";
import * as TOML from "@iarna/toml";
import { parse, stringify } from "yaml";
import { applyRecommendedSalesforceSidecarOverride } from "./config-audit.js";
import { scanPrettierConfigAuditReports, type PrettierConfigAuditReport } from "./config-audit-scan.js";

export function formatConfigAuditReports(root: string, reports: PrettierConfigAuditReport[]): string {
  if (reports.length === 0) {
    return "No risky Prettier config parser overrides found.\n";
  }

  const normalizedRoot = root.replaceAll("\\", "/");
  const lines: string[] = [];
  lines.push(`Found ${reports.length} config file(s) with Salesforce metadata parser override risk:`);

  for (const report of reports) {
    const relativePath = toRelativePath(normalizedRoot, report.configPath);
    lines.push(`- ${relativePath}`);
    for (const finding of report.findings) {
      lines.push(`  - [${finding.level}] ${finding.code}`);
      lines.push(`    ${finding.message}`);
      if (finding.recommendation) {
        lines.push("    Recommended override:");
        lines.push(`      files: ${JSON.stringify(finding.recommendation.override.files)}`);
        lines.push(`      options: ${JSON.stringify(finding.recommendation.override.options)}`);
      }
    }
  }

  return `${lines.join("\n")}\n`;
}

export function formatConfigAuditReportsJson(root: string, reports: PrettierConfigAuditReport[]): string {
  const normalizedRoot = root.replaceAll("\\", "/");
  const payload = {
    root: normalizedRoot,
    findingCount: reports.reduce((sum, report) => sum + report.findings.length, 0),
    configCount: reports.length,
    reports: reports.map((report) => ({
      configPath: report.configPath.replaceAll("\\", "/"),
      configPathRelative: toRelativePath(normalizedRoot, report.configPath),
      findings: report.findings
    }))
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function formatConfigAuditReportsJsonWithFixSummary(
  root: string,
  reports: PrettierConfigAuditReport[],
  fixSummary: ConfigAuditFixSummary | null
): string {
  const normalizedRoot = root.replaceAll("\\", "/");
  const payload = {
    root: normalizedRoot,
    findingCount: reports.reduce((sum, report) => sum + report.findings.length, 0),
    configCount: reports.length,
    reports: reports.map((report) => ({
      configPath: report.configPath.replaceAll("\\", "/"),
      configPathRelative: toRelativePath(normalizedRoot, report.configPath),
      findings: report.findings
    })),
    fixSummary
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

function toRelativePath(root: string, configPath: string): string {
  const normalizedPath = configPath.replaceAll("\\", "/");
  const prefix = root.endsWith("/") ? root : `${root}/`;
  if (normalizedPath.startsWith(prefix)) {
    return normalizedPath.slice(prefix.length);
  }
  return normalizedPath;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const applyFixes = args.includes("--apply-fixes");
  const positional = args.filter((arg) => arg !== "--json" && arg !== "--apply-fixes");
  const rawRoot = positional[0] ?? process.cwd();
  const absoluteRoot = path.resolve(rawRoot);
  let reports = await scanPrettierConfigAuditReports(absoluteRoot);
  let fixSummary: ConfigAuditFixSummary | null = null;
  if (applyFixes && reports.length > 0) {
    fixSummary = await applyConfigFixesForReports(reports);
    reports = await scanPrettierConfigAuditReports(absoluteRoot);
  }
  const output = jsonMode
    ? formatConfigAuditReportsJsonWithFixSummary(absoluteRoot, reports, fixSummary)
    : formatConfigAuditReports(absoluteRoot, reports);
  process.stdout.write(output);
  if (fixSummary && !jsonMode) {
    process.stdout.write(`Applied fixes: ${fixSummary.fixed} updated, ${fixSummary.skipped} skipped.\n`);
  }
  if (reports.length > 0) {
    process.exitCode = 1;
  }
}

export type ConfigAuditFixSummary = {
  fixed: number;
  skipped: number;
  actions: ConfigAuditFixAction[];
};

export type ConfigAuditFixActionStatus = "fixed" | "skipped";

export type ConfigAuditFixAction = {
  configPath: string;
  status: ConfigAuditFixActionStatus;
  reason: "updated" | "unsupported-config-format" | "parse-or-write-failed" | "no-change";
};

export async function applyConfigFixesForReports(
  reports: PrettierConfigAuditReport[]
): Promise<ConfigAuditFixSummary> {
  let fixed = 0;
  let skipped = 0;
  const actions: ConfigAuditFixAction[] = [];
  for (const report of reports) {
    const action = await tryApplyConfigFixPath(report.configPath);
    actions.push(action);
    if (action.status === "fixed") {
      fixed += 1;
    } else {
      skipped += 1;
    }
  }
  return { fixed, skipped, actions };
}

export async function tryApplyConfigFixPath(
  configPath: string
): Promise<ConfigAuditFixAction> {
  const normalized = configPath.replaceAll("\\", "/");
  const basename = path.basename(normalized);
  const yamlConfigBasenames = new Set([".prettierrc.yaml", ".prettierrc.yml"]);
  const tomlConfigBasenames = new Set([".prettierrc.toml"]);
  const json5ConfigBasenames = new Set([".prettierrc.json5"]);
  const moduleConfigBasenames = new Set([
    ".prettierrc.js",
    ".prettierrc.cjs",
    ".prettierrc.mjs",
    ".prettierrc.ts",
    ".prettierrc.mts",
    ".prettierrc.cts",
    "prettier.config.js",
    "prettier.config.cjs",
    "prettier.config.mjs",
    "prettier.config.ts",
    "prettier.config.mts",
    "prettier.config.cts"
  ]);
  const isJsonConfig = basename === ".prettierrc" || basename === ".prettierrc.json" || basename === "package.json";
  const isYamlConfig = yamlConfigBasenames.has(basename);
  const isTomlConfig = tomlConfigBasenames.has(basename);
  const isJson5Config = json5ConfigBasenames.has(basename);
  const isModuleConfig = moduleConfigBasenames.has(basename);
  if (!isJsonConfig && !isYamlConfig && !isTomlConfig && !isJson5Config && !isModuleConfig) {
    return { configPath, status: "skipped", reason: "unsupported-config-format" };
  }

  try {
    const source = await readFile(configPath, "utf8");
    if (isYamlConfig) {
      const value = parse(source) as unknown;
      if (!value || typeof value !== "object") {
        return { configPath, status: "skipped", reason: "no-change" };
      }
      const apply = applyFixTransforms(value as Record<string, unknown>);
      if (!apply.changed || !apply.config) {
        return { configPath, status: "skipped", reason: "no-change" };
      }
      await writeFile(configPath, stringify(apply.config), "utf8");
      return { configPath, status: "fixed", reason: "updated" };
    }
    if (isTomlConfig) {
      const value = TOML.parse(source) as unknown;
      if (!value || typeof value !== "object") {
        return { configPath, status: "skipped", reason: "no-change" };
      }
      const apply = applyFixTransforms(value as Record<string, unknown>);
      if (!apply.changed || !apply.config) {
        return { configPath, status: "skipped", reason: "no-change" };
      }
      await writeFile(configPath, TOML.stringify(apply.config as never), "utf8");
      return { configPath, status: "fixed", reason: "updated" };
    }
    if (isJson5Config) {
      const value = JSON5.parse(source) as unknown;
      if (!value || typeof value !== "object") {
        return { configPath, status: "skipped", reason: "no-change" };
      }
      const apply = applyFixTransforms(value as Record<string, unknown>);
      if (!apply.changed || !apply.config) {
        return { configPath, status: "skipped", reason: "no-change" };
      }
      await writeFile(configPath, `${JSON.stringify(apply.config, null, 2)}\n`, "utf8");
      return { configPath, status: "fixed", reason: "updated" };
    }
    if (isModuleConfig) {
      try {
        const importUrl = `${pathToFileURL(configPath).href}?t=${Date.now()}`;
        const mod = await import(importUrl);
        const loaded = (mod.default ?? mod) as unknown;
        if (loaded && typeof loaded === "object") {
          const serialized = toSerializableConfigObject(loaded);
          if (serialized) {
            const apply = applyFixTransforms(serialized);
            if (apply.changed && apply.config) {
              const rendered = renderModuleConfig(source, basename, apply.config);
              await writeFile(configPath, rendered, "utf8");
              return { configPath, status: "fixed", reason: "updated" };
            }
          }
        }
      } catch {
        // fall through to text patch fallback
      }

      const textPatched = applyModuleTextPatchFallback(source);
      if (textPatched.status === "updated") {
        await writeFile(configPath, textPatched.source, "utf8");
        return { configPath, status: "fixed", reason: "updated" };
      }
      if (textPatched.status === "no-change") {
        return { configPath, status: "skipped", reason: "no-change" };
      }
      return { configPath, status: "skipped", reason: "parse-or-write-failed" };
    }

    if (basename === "package.json") {
      const pkg = JSON.parse(source) as { prettier?: unknown } & Record<string, unknown>;
      const prettierConfig =
        pkg.prettier && typeof pkg.prettier === "object" ? (pkg.prettier as Record<string, unknown>) : {};
      const apply = applyFixTransforms(prettierConfig);
      if (!apply.changed || !apply.config) {
        return { configPath, status: "skipped", reason: "no-change" };
      }
      pkg.prettier = apply.config;
      await writeFile(configPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
      return { configPath, status: "fixed", reason: "updated" };
    }

    const config = JSON.parse(source) as Record<string, unknown>;
    const apply = applyFixTransforms(config);
    if (!apply.changed || !apply.config) {
      return { configPath, status: "skipped", reason: "no-change" };
    }
    await writeFile(configPath, `${JSON.stringify(apply.config, null, 2)}\n`, "utf8");
    return { configPath, status: "fixed", reason: "updated" };
  } catch {
    return { configPath, status: "skipped", reason: "parse-or-write-failed" };
  }
}

function applyFixTransforms(config: Record<string, unknown>): { config: Record<string, unknown> | null; changed: boolean } {
  return applyRecommendedSalesforceSidecarOverride(config);
}

function toSerializableConfigObject(value: unknown): Record<string, unknown> | null {
  if (hasNonJsonValues(value)) {
    return null;
  }
  try {
    const json = JSON.stringify(value);
    if (!json) {
      return null;
    }
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function hasNonJsonValues(value: unknown): boolean {
  if (value === null) {
    return false;
  }
  const valueType = typeof value;
  if (valueType === "function" || valueType === "symbol" || valueType === "bigint" || valueType === "undefined") {
    return true;
  }
  if (valueType !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (hasNonJsonValues(item)) {
        return true;
      }
    }
    return false;
  }
  for (const entry of Object.values(value as Record<string, unknown>)) {
    if (hasNonJsonValues(entry)) {
      return true;
    }
  }
  return false;
}

function renderModuleConfig(source: string, basename: string, config: Record<string, unknown>): string {
  const preferCjs =
    basename.endsWith(".cjs") || source.includes("module.exports") || (basename.endsWith(".js") && !source.includes("export default"));
  const body = JSON.stringify(config, null, 2);
  if (preferCjs) {
    return `module.exports = ${body};\n`;
  }
  return `export default ${body};\n`;
}

function applyModuleTextPatchFallback(source: string): { status: "updated" | "no-change" | "failed"; source: string } {
  const normalized = source.toLowerCase();
  if (hasSalesforceMetadataOverrideText(normalized)) {
    return { status: "no-change", source };
  }

  const overridesPatched = patchExistingOverridesArray(source);
  if (overridesPatched) {
    return { status: "updated", source: overridesPatched };
  }
  if (!normalized.includes("*-meta.xml")) {
    return { status: "no-change", source };
  }

  const objectPatched = patchModuleRootObject(source);
  if (objectPatched) {
    return { status: "updated", source: objectPatched };
  }

  return { status: "failed", source };
}

function hasSalesforceMetadataOverrideText(normalizedLowerSource: string): boolean {
  const mentionsSalesforceMetadataParser = /parser\s*[:=]\s*["']?salesforce-metadata-xml["']?/.test(normalizedLowerSource);
  const hasMetaPattern = normalizedLowerSource.includes("*-meta.xml");
  const hasLabelsPattern = normalizedLowerSource.includes(".labels");
  return mentionsSalesforceMetadataParser && (hasMetaPattern || hasLabelsPattern);
}

function patchExistingOverridesArray(source: string): string | null {
  const normalized = source.toLowerCase();
  const overridesKey = normalized.indexOf("overrides");
  if (overridesKey < 0) {
    return null;
  }
  const arrayStart = source.indexOf("[", overridesKey);
  if (arrayStart < 0) {
    return null;
  }
  const arrayEnd = findMatchingBracket(source, arrayStart, "[", "]");
  if (arrayEnd < 0) {
    return null;
  }

  const before = source.slice(0, arrayEnd);
  const inside = source.slice(arrayStart + 1, arrayEnd);
  const after = source.slice(arrayEnd);
  const needsComma = inside.trim().length > 0 && !inside.trimEnd().endsWith(",");
  const insertion = `${needsComma ? "," : ""}\n    {\n      files: [\"**/*-meta.xml\", \"**/*.labels\", \"**/*.labels-meta.xml\"],\n      options: { parser: \"salesforce-metadata-xml\" }\n    }\n  `;
  return `${before}${insertion}${after}`;
}

function patchModuleRootObject(source: string): string | null {
  const normalized = source.toLowerCase();
  let startSearch = normalized.indexOf("module.exports");
  if (startSearch < 0) {
    startSearch = normalized.indexOf("export default");
  }
  if (startSearch < 0) {
    return null;
  }

  const objectStart = source.indexOf("{", startSearch);
  if (objectStart < 0) {
    return null;
  }
  const objectEnd = findMatchingBracket(source, objectStart, "{", "}");
  if (objectEnd < 0) {
    return null;
  }

  const before = source.slice(0, objectEnd);
  const inside = source.slice(objectStart + 1, objectEnd);
  const after = source.slice(objectEnd);
  const trimmedInside = inside.trimEnd();
  const needsComma = trimmedInside.length > 0 && !trimmedInside.endsWith(",");
  const insertion = `${needsComma ? "," : ""}\n  overrides: [\n    {\n      files: [\"**/*-meta.xml\", \"**/*.labels\", \"**/*.labels-meta.xml\"],\n      options: { parser: \"salesforce-metadata-xml\" }\n    }\n  ]\n`;
  return `${before}${insertion}${after}`;
}

function findMatchingBracket(source: string, startIndex: number, open: "[" | "{" | "(", close: "]" | "}" | ")"): number {
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1] ?? "";
    const prev = source[index - 1] ?? "";

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
      }
      continue;
    }
    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }
    if (!inSingle && !inDouble && !inTemplate) {
      if (char === "/" && next === "/") {
        inLineComment = true;
        index += 1;
        continue;
      }
      if (char === "/" && next === "*") {
        inBlockComment = true;
        index += 1;
        continue;
      }
    }
    if (!inDouble && !inTemplate && char === "'" && prev !== "\\") {
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && !inTemplate && char === "\"" && prev !== "\\") {
      inDouble = !inDouble;
      continue;
    }
    if (!inSingle && !inDouble && char === "`" && prev !== "\\") {
      inTemplate = !inTemplate;
      continue;
    }
    if (inSingle || inDouble || inTemplate) {
      continue;
    }

    if (char === open) {
      depth += 1;
      continue;
    }
    if (char === close) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
      continue;
    }
  }
  return -1;
}

const isEntryPoint = (() => {
  const entryArg = process.argv[1];
  if (!entryArg) {
    return false;
  }
  const normalizedArg = path.resolve(entryArg);
  const normalizedCurrent = path.resolve(fileURLToPath(import.meta.url));
  return normalizedArg === normalizedCurrent;
})();

if (isEntryPoint) {
  await main();
}
