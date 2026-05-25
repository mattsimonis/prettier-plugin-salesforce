import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyConfigFixesForReports,
  formatConfigAuditReports,
  formatConfigAuditReportsJson,
  formatConfigAuditReportsJsonWithFixSummary
} from "./config-audit-cli.js";
import { scanPrettierConfigAuditReports } from "./config-audit-scan.js";
import type { PrettierConfigAuditReport } from "./config-audit-scan.js";

describe("prettier config audit cli formatter", () => {
  it("renders empty report summary", () => {
    const output = formatConfigAuditReports("/tmp/workspace", []);
    expect(output).toBe("No risky Prettier config parser overrides found.\n");
  });

  it("renders findings with relative config paths and recommended override", () => {
    const reports: PrettierConfigAuditReport[] = [
      {
        configPath: "/tmp/workspace/project-a/.prettierrc",
        findings: [
          {
            level: "warn",
            code: "meta-xml-parser-override-without-salesforce-sidecar-override",
            message: "Detected broad '*-meta.xml' parser override without Salesforce sidecar override.",
            recommendation: {
              override: {
                files: ["**/*-meta.xml", "**/*.labels", "**/*.labels-meta.xml"],
                options: { parser: "salesforce-metadata-xml" }
              }
            }
          }
        ]
      }
    ];

    const output = formatConfigAuditReports("/tmp/workspace", reports);
    expect(output).toContain("Found 1 config file(s) with Salesforce metadata parser override risk:");
    expect(output).toContain("- project-a/.prettierrc");
    expect(output).toContain("meta-xml-parser-override-without-salesforce-sidecar-override");
    expect(output).toContain('"salesforce-metadata-xml"');
    expect(output).not.toContain("known-extension");
  });

  it("renders findings without recommendation text when recommendation is absent", () => {
    const reports: PrettierConfigAuditReport[] = [
      {
        configPath: "/tmp/workspace/project-b/.prettierrc.yaml",
        findings: [
          {
            level: "warn",
            code: "config-file-unreadable",
            message: "Config format is not currently parseable by this scanner."
          }
        ]
      }
    ];
    const output = formatConfigAuditReports("/tmp/workspace", reports);
    expect(output).toContain("config-file-unreadable");
    expect(output).not.toContain("Recommended override:");
  });

  it("renders JSON output with relative and absolute config paths", () => {
    const reports: PrettierConfigAuditReport[] = [
      {
        configPath: "/tmp/workspace/project-a/.prettierrc",
        findings: [
          {
            level: "warn",
            code: "meta-xml-parser-override-without-salesforce-sidecar-override",
            message: "Detected broad '*-meta.xml' parser override without Salesforce sidecar override.",
            recommendation: {
              override: {
                files: ["**/*-meta.xml", "**/*.labels", "**/*.labels-meta.xml"],
                options: { parser: "salesforce-metadata-xml" }
              }
            }
          }
        ]
      }
    ];

    const output = formatConfigAuditReportsJson("/tmp/workspace", reports);
    const parsed = JSON.parse(output) as {
      root: string;
      configCount: number;
      findingCount: number;
      reports: Array<{
        configPathRelative: string;
        configPath: string;
        findings?: Array<{ recommendation?: { override?: { options?: { parser?: string } } } }>;
      }>;
    };

    expect(parsed.root).toBe("/tmp/workspace");
    expect(parsed.configCount).toBe(1);
    expect(parsed.findingCount).toBe(1);
    expect(parsed.reports[0]?.configPathRelative).toBe("project-a/.prettierrc");
    expect(parsed.reports[0]?.configPath).toBe("/tmp/workspace/project-a/.prettierrc");
    const recommendation = parsed.reports[0]?.findings?.[0]?.recommendation;
    expect(recommendation?.override?.options?.parser).toBe("salesforce-metadata-xml");
  });

  it("applies fixes for JSON, JSON5, YAML, TOML, and JS/TS module configs", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sf-prettier-audit-fix-"));
    const jsonConfig = path.join(root, "project-a/.prettierrc");
    const packageConfig = path.join(root, "project-b/package.json");
    const yamlConfig = path.join(root, "project-c/.prettierrc.yaml");
    const tomlConfig = path.join(root, "project-d/.prettierrc.toml");
    const json5Config = path.join(root, "project-e/.prettierrc.json5");
    const cjsConfig = path.join(root, "project-f/prettier.config.cjs");
    const mjsConfig = path.join(root, "project-g/prettier.config.mjs");
    const tsConfig = path.join(root, "project-i/prettier.config.ts");

    await mkdir(path.dirname(jsonConfig), { recursive: true });
    await mkdir(path.dirname(packageConfig), { recursive: true });
    await mkdir(path.dirname(yamlConfig), { recursive: true });
    await mkdir(path.dirname(tomlConfig), { recursive: true });
    await mkdir(path.dirname(json5Config), { recursive: true });
    await mkdir(path.dirname(cjsConfig), { recursive: true });
    await mkdir(path.dirname(mjsConfig), { recursive: true });
    await mkdir(path.dirname(tsConfig), { recursive: true });

    await writeFile(
      jsonConfig,
      JSON.stringify({ overrides: [{ files: "**/*-meta.xml", options: { parser: "xml" } }] }, null, 2),
      "utf8"
    );
    await writeFile(
      packageConfig,
      JSON.stringify(
        {
          name: "project-b",
          prettier: {
            overrides: [{ files: "**/*-meta.xml", options: { parser: "html" } }]
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      yamlConfig,
      "overrides:\n  - files: \"**/*-meta.xml\"\n    options:\n      parser: html\n",
      "utf8"
    );
    await writeFile(
      tomlConfig,
      "[[overrides]]\nfiles = \"**/*-meta.xml\"\n[overrides.options]\nparser = \"html\"\n",
      "utf8"
    );
    await writeFile(
      json5Config,
      "{\n  overrides: [\n    {\n      files: \"**/*-meta.xml\",\n      options: { parser: \"html\" }\n    }\n  ]\n}\n",
      "utf8"
    );
    await writeFile(
      cjsConfig,
      "module.exports = { overrides: [{ files: \"**/*-meta.xml\", options: { parser: \"html\" } }] };\n",
      "utf8"
    );
    await writeFile(
      mjsConfig,
      "export default { overrides: [{ files: \"**/*-meta.xml\", options: { parser: \"html\" } }] };\n",
      "utf8"
    );
    await writeFile(
      tsConfig,
      "export default { overrides: [{ files: \"**/*-meta.xml\", options: { parser: \"html\" } }] };\n",
      "utf8"
    );

    const before = await scanPrettierConfigAuditReports(root);
    expect(before.length).toBe(8);

    const summary = await applyConfigFixesForReports(before);
    expect(summary.fixed).toBe(8);
    expect(summary.skipped).toBe(0);
    expect(summary.actions.map((action) => action.reason).sort((a, b) => a.localeCompare(b))).toEqual([
      "updated",
      "updated",
      "updated",
      "updated",
      "updated",
      "updated",
      "updated",
      "updated"
    ]);

    const after = await scanPrettierConfigAuditReports(root);
    const afterPaths = after.map((report) => report.configPath).sort((a, b) => a.localeCompare(b));
    expect(afterPaths).toEqual([]);

    const jsonBody = JSON.parse(await readFile(jsonConfig, "utf8")) as { overrides?: Array<{ options?: { parser?: string } }> };
    expect(jsonBody.overrides?.some((entry) => entry.options?.parser === "salesforce-metadata-xml")).toBe(true);

    const packageBody = JSON.parse(await readFile(packageConfig, "utf8")) as { prettier?: { overrides?: Array<{ options?: { parser?: string } }> } };
    expect(packageBody.prettier?.overrides?.some((entry) => entry.options?.parser === "salesforce-metadata-xml")).toBe(true);

    const yamlBody = await readFile(yamlConfig, "utf8");
    expect(yamlBody).toContain("salesforce-metadata-xml");

    const tomlBody = await readFile(tomlConfig, "utf8");
    expect(tomlBody).toContain("salesforce-metadata-xml");

    const json5Body = JSON.parse(await readFile(json5Config, "utf8")) as { overrides?: Array<{ options?: { parser?: string } }> };
    expect(json5Body.overrides?.some((entry) => entry.options?.parser === "salesforce-metadata-xml")).toBe(true);

    const cjsBody = await readFile(cjsConfig, "utf8");
    expect(cjsBody).toContain("module.exports");
    expect(cjsBody).toContain("salesforce-metadata-xml");

    const mjsBody = await readFile(mjsConfig, "utf8");
    expect(mjsBody).toContain("export default");
    expect(mjsBody).toContain("salesforce-metadata-xml");

    const tsBody = await readFile(tsConfig, "utf8");
    expect(tsBody).toContain("export default");
    expect(tsBody).toContain("salesforce-metadata-xml");
  });

  it("skips module configs that are not safely serializable", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sf-prettier-audit-fix-module-unsafe-"));
    const unsafeJsConfig = path.join(root, "project-h/prettier.config.cjs");
    await mkdir(path.dirname(unsafeJsConfig), { recursive: true });
    await writeFile(
      unsafeJsConfig,
      "module.exports = { overrides: [{ files: \"**/*-meta.xml\", options: { parser: \"html\" } }], pluginSearchDirs: [Symbol.for('x')] };\n",
      "utf8"
    );

    const before = await scanPrettierConfigAuditReports(root);
    expect(before.length).toBe(1);

    const summary = await applyConfigFixesForReports(before);
    expect(summary.fixed).toBe(1);
    expect(summary.skipped).toBe(0);
    expect(summary.actions[0]?.reason).toBe("updated");
  });

  it("applies module text fallback patch when module import fails", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sf-prettier-audit-fix-module-fallback-"));
    const failingTsConfig = path.join(root, "project-i/prettier.config.ts");
    await mkdir(path.dirname(failingTsConfig), { recursive: true });
    await writeFile(
      failingTsConfig,
      "import missing from 'does-not-exist';\nexport default { overrides: [{ files: \"**/*-meta.xml\", options: { parser: \"html\" } }] };\n",
      "utf8"
    );

    const before = await scanPrettierConfigAuditReports(root);
    expect(before.length).toBe(1);

    const summary = await applyConfigFixesForReports(before);
    expect(summary.fixed).toBe(1);
    expect(summary.skipped).toBe(0);
    expect(summary.actions[0]?.reason).toBe("updated");

    const body = await readFile(failingTsConfig, "utf8");
    expect(body).toContain("salesforce-metadata-xml");
  });

  it("adds overrides block to module config fallback when broad meta override exists without overrides array", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sf-prettier-audit-fix-module-add-overrides-"));
    const failingTsConfig = path.join(root, "project-j/prettier.config.ts");
    await mkdir(path.dirname(failingTsConfig), { recursive: true });
    await writeFile(
      failingTsConfig,
      "import missing from 'does-not-exist';\nexport default { parser: \"html\", files: \"**/*-meta.xml\" };\n",
      "utf8"
    );

    const before = await scanPrettierConfigAuditReports(root);
    expect(before.length).toBe(1);

    const summary = await applyConfigFixesForReports(before);
    expect(summary.fixed).toBe(1);
    expect(summary.skipped).toBe(0);
    expect(summary.actions[0]?.reason).toBe("updated");

    const body = await readFile(failingTsConfig, "utf8");
    expect(body).toContain("overrides:");
    expect(body).toContain("salesforce-metadata-xml");
  });

  it("renders JSON output with fix summary payload", () => {
    const reports: PrettierConfigAuditReport[] = [
      {
        configPath: "/tmp/workspace/project-a/.prettierrc",
        findings: [
          {
            level: "warn",
            code: "meta-xml-parser-override-without-salesforce-sidecar-override",
            message: "Detected broad '*-meta.xml' parser override without Salesforce sidecar override."
          }
        ]
      }
    ];

    const output = formatConfigAuditReportsJsonWithFixSummary("/tmp/workspace", reports, {
      fixed: 1,
      skipped: 0,
      actions: [{ configPath: "/tmp/workspace/project-a/.prettierrc", status: "fixed", reason: "updated" }]
    });

    const parsed = JSON.parse(output) as {
      fixSummary: { fixed: number; skipped: number; actions: Array<{ reason: string }> } | null;
    };
    expect(parsed.fixSummary?.fixed).toBe(1);
    expect(parsed.fixSummary?.actions[0]?.reason).toBe("updated");
  });
});
