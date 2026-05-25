// Prettier plugin language registration is extension-driven and static.
// Keep this registry explicit for deterministic routing, and verify it
// against prettier.getSupportInfo() in contract tests.
export const PRETTIER_CORE_DATA_EXTENSIONS = [
  ".json",
  ".jsonc",
  ".json5",
  ".geojson",
  ".avsc",
  ".webmanifest",
  ".yml",
  ".yaml",
  ".md",
  ".mdx",
  ".mkd"
] as const;

export const PRETTIER_CORE_CODE_EXTENSIONS = [
  ".js",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".jsx",
  ".ts",
  ".tsx",
  ".css",
  ".less",
  ".scss",
  ".html",
  ".mjml",
  ".hbs",
  ".handlebars",
  ".vue",
  ".graphql",
  ".gql",
  ".graphqls"
] as const;

export const PRETTIER_CORE_STATICRESOURCE_EXTENSIONS = [
  ...PRETTIER_CORE_CODE_EXTENSIONS,
  ...PRETTIER_CORE_DATA_EXTENSIONS
] as const;

export const PRETTIER_CORE_PROJECT_CODE_EXTENSIONS = [
  ...PRETTIER_CORE_CODE_EXTENSIONS,
  ".jsonc",
  ".json5",
  ".geojson",
  ".avsc",
  ".webmanifest",
  ".mdx",
  ".mkd"
] as const;
