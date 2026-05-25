const labelSortOptionNames = ["salesforceSortLabelsByFullName", "salesforceSortLabelEntriesByFullName"];
const protectedRuntimeOptionNames = ["parser", "filepath", "plugins"];

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

export function normalizePlaygroundConfigOptions(configOptions, defaults) {
  const nextConfig = omitRuntimeOptions(configOptions);
  return {
    ...nextConfig,
    printWidth: readBoundedInteger(nextConfig.printWidth, defaults.printWidth, configNumberBounds.printWidth),
    tabWidth: readBoundedInteger(nextConfig.tabWidth, defaults.tabWidth, configNumberBounds.tabWidth)
  };
}
