const labelSortOptionNames = ["salesforceSortLabelsByFullName", "salesforceSortLabelEntriesByFullName"];
const protectedRuntimeOptionNames = ["parser", "filepath", "plugins"];
const booleanOptionNames = [
  "useTabs",
  "singleQuote",
  "bracketSameLine",
  "salesforceSortLabelsByFullName",
  "salesforceFinalNewline",
  "salesforceBlankLineBeforeLineComment"
];
const choiceOptions = {
  trailingComma: ["none", "es5", "all"],
  salesforceTestVisiblePlacement: ["own-line", "inline"],
  salesforceLogicalOperatorPosition: ["end-of-line", "start-of-line"]
};

export const defaultPlaygroundConfig = {
  printWidth: 100,
  tabWidth: 4,
  useTabs: false,
  singleQuote: false,
  bracketSameLine: false,
  trailingComma: "none",
  salesforceSortLabelsByFullName: false,
  salesforceFinalNewline: true,
  salesforceTestVisiblePlacement: "own-line",
  salesforceBlankLineBeforeLineComment: false,
  salesforceLogicalOperatorPosition: "end-of-line"
};

export const configNumberBounds = {
  printWidth: { min: 20, max: 240 },
  tabWidth: { min: 1, max: 12 }
};

export function applySortLabelsToggle(configOptions, enabled) {
  const nextConfig = {
    ...configOptions,
    salesforceSortLabelsByFullName: enabled
  };
  if (Object.hasOwn(nextConfig, "salesforceSortLabelEntriesByFullName")) {
    nextConfig.salesforceSortLabelEntriesByFullName = enabled;
  }
  return nextConfig;
}

export function readSortLabelsToggle(configOptions) {
  return labelSortOptionNames.some((optionName) => configOptions[optionName] === true);
}

export function omitRuntimeOptions(configOptions) {
  const nextConfig = { ...configOptions };
  for (const optionName of protectedRuntimeOptionNames) {
    delete nextConfig[optionName];
  }
  return nextConfig;
}

export function readBoundedInteger(value, fallback, bounds) {
  if (!Number.isInteger(value)) {
    return fallback;
  }
  return Math.min(Math.max(value, bounds.min), bounds.max);
}

export function readBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

export function readChoice(value, fallback, choices) {
  return choices.includes(value) ? value : fallback;
}

export function normalizePlaygroundConfigOptions(configOptions, defaults) {
  const nextConfig = omitRuntimeOptions(configOptions);
  const normalizedConfig = {
    ...nextConfig,
    printWidth: readBoundedInteger(nextConfig.printWidth, defaults.printWidth, configNumberBounds.printWidth),
    tabWidth: readBoundedInteger(nextConfig.tabWidth, defaults.tabWidth, configNumberBounds.tabWidth)
  };
  for (const optionName of booleanOptionNames) {
    if (Object.hasOwn(nextConfig, optionName)) {
      normalizedConfig[optionName] = readBoolean(nextConfig[optionName], defaults[optionName]);
    }
  }
  for (const [optionName, choices] of Object.entries(choiceOptions)) {
    if (Object.hasOwn(nextConfig, optionName)) {
      normalizedConfig[optionName] = readChoice(nextConfig[optionName], defaults[optionName], choices);
    }
  }
  return normalizedConfig;
}
