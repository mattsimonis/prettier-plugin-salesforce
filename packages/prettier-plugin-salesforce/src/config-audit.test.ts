import { describe, expect, it } from "vitest";
import {
  applyRecommendedSalesforceSidecarOverride,
  auditPrettierConfig,
  recommendedSalesforceSidecarOverride
} from "./config-audit.js";

describe("prettier config audit", () => {
  it("returns no findings when config is empty", () => {
    expect(auditPrettierConfig({})).toEqual([]);
  });

  it("returns no findings when broad meta.xml html override is absent", () => {
    const config = {
      overrides: [
        {
          files: "**/lwc/**/*.html",
          options: { parser: "lwc" }
        }
      ]
    };
    expect(auditPrettierConfig(config)).toEqual([]);
  });

  it("returns a finding when broad meta.xml html override exists without Salesforce sidecar override", () => {
    const config = {
      overrides: [
        {
          files: "**/*-meta.xml",
          options: { parser: "html" }
        }
      ]
    };
    const findings = auditPrettierConfig(config);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.code).toBe("meta-xml-parser-override-without-salesforce-sidecar-override");
    expect(findings[0]?.recommendation).toEqual(recommendedSalesforceSidecarOverride());
  });

  it("returns a finding when broad meta.xml override uses non-Salesforce parser", () => {
    const config = {
      overrides: [
        {
          files: "**/*-meta.xml",
          options: { parser: "xml" }
        }
      ]
    };
    const findings = auditPrettierConfig(config);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.code).toBe("meta-xml-parser-override-without-salesforce-sidecar-override");
  });

  it("returns no findings when Salesforce sidecar override is present", () => {
    const config = {
      overrides: [
        {
          files: "**/*-meta.xml",
          options: { parser: "html" }
        },
        {
          files: ["**/*-meta.xml", "**/*.labels", "**/*.labels-meta.xml"],
          options: { parser: "salesforce-metadata-xml" }
        }
      ]
    };
    expect(auditPrettierConfig(config)).toEqual([]);
  });

  it("applies recommended sidecar override for risky config objects", () => {
    const config = {
      overrides: [
        {
          files: "**/*-meta.xml",
          options: { parser: "xml" }
        }
      ]
    };

    const result = applyRecommendedSalesforceSidecarOverride(config);
    expect(result.changed).toBe(true);
    expect(result.config).not.toBeNull();
    expect(auditPrettierConfig(result.config)).toEqual([]);
  });

  it("does not modify already-safe config objects", () => {
    const safe = {
      overrides: [
        {
          files: "**/*-meta.xml",
          options: { parser: "html" }
        },
        {
          files: ["**/*-meta.xml", "**/*.labels", "**/*.labels-meta.xml"],
          options: { parser: "salesforce-metadata-xml" }
        }
      ]
    };
    const result = applyRecommendedSalesforceSidecarOverride(safe);
    expect(result.changed).toBe(false);
    expect(result.config).toBe(safe);
  });
});
