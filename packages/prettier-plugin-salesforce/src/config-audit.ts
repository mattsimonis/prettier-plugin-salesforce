export type PrettierConfigAuditLevel = "warn";

export type SalesforceSidecarOverrideRecommendation = {
  files: string[];
  options: { parser: "salesforce-metadata-xml" };
};

export type SalesforceRecommendation = {
  override: SalesforceSidecarOverrideRecommendation;
};

export type PrettierConfigAuditFinding = {
  level: PrettierConfigAuditLevel;
  code:
    | "meta-xml-parser-override-without-salesforce-sidecar-override"
    | "config-file-unreadable";
  message: string;
  recommendation?: SalesforceRecommendation;
};

export function auditPrettierConfig(config: unknown): PrettierConfigAuditFinding[] {
  const overrides = readOverrides(config);
  if (overrides.length === 0) {
    return [];
  }

  const hasBroadMetaXmlOverride = overrides.some((override) => {
    const parser = override.options?.parser;
    if (!parser) {
      return false;
    }
    if (isSalesforceMetadataSafeParser(parser)) {
      return false;
    }
    return override.files.some((pattern) => pattern.includes("*-meta.xml"));
  });

  if (!hasBroadMetaXmlOverride) {
    return [];
  }

  const hasSalesforceSidecarOverride = overrides.some((override) => {
    const parser = override.options?.parser;
    if (parser !== "salesforce-metadata-xml") {
      return false;
    }

    return override.files.some(
      (pattern) =>
        pattern.includes("*-meta.xml") || pattern.includes(".labels") || pattern.includes(".labels-meta.xml")
    );
  });

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

export function recommendedSalesforceSidecarOverride(): {
  override: SalesforceSidecarOverrideRecommendation;
} {
  return {
    override: {
      files: ["**/*-meta.xml", "**/*.labels", "**/*.labels-meta.xml"],
      options: { parser: "salesforce-metadata-xml" }
    }
  };
}

export function applyRecommendedSalesforceSidecarOverride(config: unknown): {
  config: Record<string, unknown> | null;
  changed: boolean;
} {
  if (!config || typeof config !== "object") {
    return { config: null, changed: false };
  }

  const original = config as Record<string, unknown>;
  const overridesRaw = original.overrides;
  const overrides = Array.isArray(overridesRaw) ? [...overridesRaw] : [];
  const alreadySafe = auditPrettierConfig({ ...original, overrides }).length === 0;
  if (alreadySafe) {
    return { config: original, changed: false };
  }

  const recommendation = recommendedSalesforceSidecarOverride();
  overrides.push(recommendation.override);
  return {
    config: {
      ...original,
      overrides
    },
    changed: true
  };
}

type NormalizedOverride = {
  files: string[];
  options?: { parser?: string };
};

function readOverrides(config: unknown): NormalizedOverride[] {
  if (!config || typeof config !== "object") {
    return [];
  }
  const raw = (config as { overrides?: unknown }).overrides;
  if (!Array.isArray(raw)) {
    return [];
  }

  const out: NormalizedOverride[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const filesRaw = (entry as { files?: unknown }).files;
    const files = normalizeFiles(filesRaw);
    if (files.length === 0) {
      continue;
    }
    const parserRaw = (entry as { options?: { parser?: unknown } }).options?.parser;
    out.push({
      files,
      options: { parser: typeof parserRaw === "string" ? parserRaw : undefined }
    });
  }
  return out;
}

function normalizeFiles(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function isSalesforceMetadataSafeParser(parser: string): boolean {
  return parser === "salesforce-metadata-xml" || parser === "salesforce-router-by-path";
}
