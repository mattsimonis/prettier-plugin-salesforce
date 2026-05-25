import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import JSON5 from "json5";
import * as TOML from "@iarna/toml";
import { parse as parseYaml } from "yaml";
import {
  auditPrettierConfig,
  recommendedSalesforceSidecarOverride,
  type PrettierConfigAuditFinding
} from "./config-audit.js";

const CONFIG_BASENAMES = new Set([
  ".prettierrc",
  ".prettierrc.json",
  ".prettierrc.json5",
  ".prettierrc.yaml",
  ".prettierrc.yml",
  ".prettierrc.toml",
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
  "prettier.config.cts",
  "package.json"
]);
const SKIP_DIRECTORY_NAMES = new Set([
  ".git",
  ".idea",
  ".vscode",
  ".sfdx",
  ".sf",
  ".claude",
  "node_modules"
]);

export type PrettierConfigAuditReport = {
  configPath: string;
  findings: PrettierConfigAuditFinding[];
};

export async function scanPrettierConfigAuditReports(root: string): Promise<PrettierConfigAuditReport[]> {
  const configPaths: string[] = [];
  await walk(root, configPaths);
  const reports: PrettierConfigAuditReport[] = [];

  for (const configPath of configPaths.sort((a, b) => a.localeCompare(b))) {
    const result = await loadConfig(configPath);
    const findings = result.config ? auditPrettierConfig(result.config) : [];
    if (result.rawText) {
      findings.push(...auditConfigTextFallback(result.rawText));
    }
    if (result.errorMessage) {
      findings.push({
        level: "warn",
        code: "config-file-unreadable",
        message: result.errorMessage
      });
    }
    if (findings.length === 0) {
      continue;
    }
    reports.push({ configPath, findings: dedupeFindings(findings) });
  }

  return reports;
}

function dedupeFindings(findings: PrettierConfigAuditFinding[]): PrettierConfigAuditFinding[] {
  const out: PrettierConfigAuditFinding[] = [];
  const seen = new Set<string>();
  for (const finding of findings) {
    const key = `${finding.level}\t${finding.code}\t${finding.message}\t${JSON.stringify(finding.recommendation ?? null)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(finding);
  }
  return out;
}

async function walk(root: string, out: string[]): Promise<void> {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRECTORY_NAMES.has(entry.name)) {
      continue;
    }
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, out);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (!CONFIG_BASENAMES.has(entry.name)) {
      continue;
    }
    out.push(fullPath);
  }
}

async function loadConfig(configPath: string): Promise<{
  config: Record<string, unknown> | null;
  rawText?: string;
  errorMessage?: string;
}> {
  const basename = path.basename(configPath).toLowerCase();
  try {
    if (basename === "package.json") {
      const raw = await readFile(configPath, "utf8");
      const parsed = JSON.parse(raw) as { prettier?: unknown };
      if (!parsed.prettier || typeof parsed.prettier !== "object") {
        return { config: null };
      }
      return { config: parsed.prettier as Record<string, unknown> };
    }

    if (basename.endsWith(".yaml") || basename.endsWith(".yml")) {
      const raw = await readFile(configPath, "utf8");
      const loaded = parseYaml(raw) as unknown;
      if (!loaded || typeof loaded !== "object") {
        return { config: null, rawText: raw };
      }
      return { config: loaded as Record<string, unknown>, rawText: raw };
    }

    if (basename.endsWith(".toml")) {
      const raw = await readFile(configPath, "utf8");
      const loaded = TOML.parse(raw) as unknown;
      if (!loaded || typeof loaded !== "object") {
        return { config: null, rawText: raw };
      }
      return { config: loaded as Record<string, unknown>, rawText: raw };
    }

    if (basename.endsWith(".json5")) {
      const raw = await readFile(configPath, "utf8");
      const loaded = JSON5.parse(raw) as unknown;
      if (!loaded || typeof loaded !== "object") {
        return { config: null, rawText: raw };
      }
      return {
        config: loaded as Record<string, unknown>,
        rawText: raw
      };
    }

    if (
      basename.endsWith(".js") ||
      basename.endsWith(".cjs") ||
      basename.endsWith(".mjs") ||
      basename.endsWith(".ts") ||
      basename.endsWith(".mts") ||
      basename.endsWith(".cts")
    ) {
      const raw = await readFile(configPath, "utf8");
      try {
        const mod = await import(`${pathToFileURL(configPath).href}?scan=${Date.now()}`);
        const loaded = (mod.default ?? mod) as unknown;
        if (!loaded || typeof loaded !== "object") {
          return { config: null, rawText: raw };
        }
        return { config: loaded as Record<string, unknown>, rawText: raw };
      } catch (error) {
        return {
          config: null,
          rawText: raw,
          errorMessage: `Config could not be parsed: ${String(error).split("\n")[0]}`
        };
      }
    }

    const raw = await readFile(configPath, "utf8");
    const loaded = JSON.parse(raw) as unknown;
    if (!loaded || typeof loaded !== "object") {
      return { config: null };
    }
    return { config: loaded as Record<string, unknown> };
  } catch (error) {
    return {
      config: null,
      errorMessage: `Config could not be parsed: ${String(error).split("\n")[0]}`
    };
  }
}

function auditConfigTextFallback(raw: string): PrettierConfigAuditFinding[] {
  const normalized = raw.toLowerCase();
  const hasMetaSidecarPattern = normalized.includes("*-meta.xml");
  if (!hasMetaSidecarPattern) {
    return [];
  }

  const parserAssignments = [...normalized.matchAll(/parser\s*[:=]\s*["']?([a-z0-9-]+)["']?/g)].map((match) => match[1]);
  const mentionsNonSalesforceParser = parserAssignments.some(
    (parser) => parser !== "salesforce-metadata-xml" && parser !== "salesforce-router-by-path"
  );
  if (!mentionsNonSalesforceParser) {
    return [];
  }

  const mentionsSalesforceMetadataParser = /parser\s*[:=]\s*["']?salesforce-metadata-xml["']?/.test(normalized);
  const mentionsLabelsPattern = normalized.includes(".labels");
  const hasSalesforceSidecarOverride = mentionsSalesforceMetadataParser && (hasMetaSidecarPattern || mentionsLabelsPattern);
  if (hasSalesforceSidecarOverride) {
    return [];
  }

  return [
    {
      level: "warn",
      code: "meta-xml-parser-override-without-salesforce-sidecar-override",
      message:
        "Detected broad '*-meta.xml' parser override without Salesforce sidecar override. Metadata files can infer non-Salesforce parsers instead of salesforce-metadata-xml.",
      recommendation: recommendedSalesforceSidecarOverride()
    }
  ];
}
