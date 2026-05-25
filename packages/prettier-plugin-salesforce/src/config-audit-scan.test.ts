import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanPrettierConfigAuditReports } from "./config-audit-scan.js";

describe("prettier config audit scan", () => {
  it("finds risky meta.xml parser overrides across nested config files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sf-prettier-audit-scan-"));
    const riskyConfig = path.join(root, "project-a/.prettierrc");
    const safeConfig = path.join(root, "project-b/.prettierrc");
    const riskyJsConfig = path.join(root, "project-d/prettier.config.cjs");
    const riskyPackageJson = path.join(root, "project-e/package.json");
    const riskyYamlConfig = path.join(root, "project-f/.prettierrc.yaml");
    const riskyTomlConfig = path.join(root, "project-g/.prettierrc.toml");
    const riskyJson5Config = path.join(root, "project-h/.prettierrc.json5");
    const safeYamlConfig = path.join(root, "project-i/.prettierrc.yml");
    const riskyTsConfig = path.join(root, "project-j/prettier.config.ts");
    const ignoredRiskyConfig = path.join(root, "project-c/node_modules/lib/.prettierrc");

    await mkdir(path.dirname(riskyConfig), { recursive: true });
    await mkdir(path.dirname(safeConfig), { recursive: true });
    await mkdir(path.dirname(riskyJsConfig), { recursive: true });
    await mkdir(path.dirname(riskyPackageJson), { recursive: true });
    await mkdir(path.dirname(riskyYamlConfig), { recursive: true });
    await mkdir(path.dirname(riskyTomlConfig), { recursive: true });
    await mkdir(path.dirname(riskyJson5Config), { recursive: true });
    await mkdir(path.dirname(safeYamlConfig), { recursive: true });
    await mkdir(path.dirname(riskyTsConfig), { recursive: true });
    await mkdir(path.dirname(ignoredRiskyConfig), { recursive: true });

    await writeFile(
      riskyConfig,
      JSON.stringify(
        {
          overrides: [{ files: "**/*-meta.xml", options: { parser: "html" } }]
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      safeConfig,
      JSON.stringify(
        {
          overrides: [
            { files: "**/*-meta.xml", options: { parser: "html" } },
            {
              files: ["**/*-meta.xml", "**/*.labels", "**/*.labels-meta.xml"],
              options: { parser: "salesforce-metadata-xml" }
            }
          ]
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      riskyJsConfig,
      "module.exports = { overrides: [{ files: '**/*-meta.xml', options: { parser: 'html' } }] };\n",
      "utf8"
    );
    await writeFile(
      riskyPackageJson,
      JSON.stringify(
        {
          name: "project-e",
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
      riskyYamlConfig,
      "overrides:\n  - files: \"**/*-meta.xml\"\n    options:\n      parser: html\n",
      "utf8"
    );
    await writeFile(
      riskyTomlConfig,
      "[[overrides]]\nfiles = \"**/*-meta.xml\"\n[overrides.options]\nparser = \"html\"\n",
      "utf8"
    );
    await writeFile(
      riskyJson5Config,
      "{\n  overrides: [\n    {\n      files: \"**/*-meta.xml\",\n      options: { parser: \"html\" }\n    }\n  ]\n}\n",
      "utf8"
    );
    await writeFile(
      safeYamlConfig,
      "overrides:\n  - files: \"**/*-meta.xml\"\n    options:\n      parser: html\n  - files: [\"**/*-meta.xml\", \"**/*.labels\", \"**/*.labels-meta.xml\"]\n    options:\n      parser: salesforce-metadata-xml\n",
      "utf8"
    );
    await writeFile(
      riskyTsConfig,
      "export default {\n  overrides: [{ files: \"**/*-meta.xml\", options: { parser: \"html\" } }]\n};\n",
      "utf8"
    );
    await writeFile(
      ignoredRiskyConfig,
      JSON.stringify(
        {
          overrides: [{ files: "**/*-meta.xml", options: { parser: "html" } }]
        },
        null,
        2
      ),
      "utf8"
    );

    const reports = await scanPrettierConfigAuditReports(root);
    const reportPaths = reports.map((report) => report.configPath).sort((a, b) => a.localeCompare(b));
    expect(reportPaths).toEqual(
      [riskyConfig, riskyJsConfig, riskyPackageJson, riskyYamlConfig, riskyTomlConfig, riskyJson5Config, riskyTsConfig].sort((a, b) =>
        a.localeCompare(b)
      )
    );
    const byPath = new Map(reports.map((report) => [report.configPath, report.findings.map((finding) => finding.code)]));
    expect(byPath.get(riskyConfig)).toEqual(["meta-xml-parser-override-without-salesforce-sidecar-override"]);
    expect(byPath.get(riskyJsConfig)).toEqual(["meta-xml-parser-override-without-salesforce-sidecar-override"]);
    expect(byPath.get(riskyPackageJson)).toEqual(["meta-xml-parser-override-without-salesforce-sidecar-override"]);
    expect(byPath.get(riskyYamlConfig)).toEqual(["meta-xml-parser-override-without-salesforce-sidecar-override"]);
    expect(byPath.get(riskyTomlConfig)).toEqual(["meta-xml-parser-override-without-salesforce-sidecar-override"]);
    expect(byPath.get(riskyJson5Config)).toEqual(["meta-xml-parser-override-without-salesforce-sidecar-override"]);
    expect(byPath.get(riskyTsConfig)).toContain("meta-xml-parser-override-without-salesforce-sidecar-override");
    expect(byPath.get(safeYamlConfig)).toBeUndefined();

    const riskyConfigFinding = reports.find((report) => report.configPath === riskyConfig)?.findings[0];
    expect(riskyConfigFinding?.recommendation?.override.options.parser).toBe("salesforce-metadata-xml");
  });
});
