# prettier-plugin-salesforce

Prettier plugin for Salesforce source files.

Supported surfaces include:

- Apex (`.cls`, `.trigger`, anonymous Apex)
- Visualforce (`.page`, `.component`)
- Aura markup
- LWC HTML (plus delegated JS/CSS handling through Prettier core)
- Salesforce metadata XML (including sidecar `*-meta.xml` forms)

## Quick Start

Install in your repo:

```bash
pnpm add -D prettier prettier-plugin-salesforce
```

Add plugin to `.prettierrc`:

```json
{
  "plugins": ["prettier-plugin-salesforce"]
}
```

Format Salesforce files:

```bash
pnpm prettier --write "force-app/**/*"
```

Use in CI:

```bash
pnpm prettier --check "force-app/**/*"
```

## Playground

This repo includes a branded demo playground with a formatter UI, inferred
Salesforce routing, option toggles, editable config JSON, and SFDX-style samples
from simple to complex examples across Apex, markup, and metadata XML types.

Run it locally:

```bash
pnpm install
pnpm playground:dev
```

Build static files:

```bash
pnpm playground:build
```

Output is written to:

- `packages/playground/dist`

Preview the static build:

```bash
pnpm playground:preview
```

### GitHub Pages

The playground build uses relative asset paths (`--base ./`), so it works on
GitHub Pages and project subpaths.

One straightforward deploy flow:

```bash
pnpm playground:build
npx gh-pages -d packages/playground/dist
```

This repo also includes a GitHub Actions workflow:

- [`.github/workflows/playground-pages.yml`](.github/workflows/playground-pages.yml)

Enable Pages in repository settings with source set to `GitHub Actions`.
Then pushes to `main` deploy the playground automatically.

## Corpus Validation

Primary corpus tests run against `SF_PRETTIER_CORPUS_ROOT` when set.
Multi-corpus contracts use `SF_PRETTIER_DEFAULT_CORPUS_ROOT` as the default
root, then layer `SF_PRETTIER_EXTRA_CORPUS_ROOTS`.
If unset, the harness uses the first available local corpus root.

You can layer extra real-world corpora into the same contracts with:

- `SF_PRETTIER_EXTRA_CORPUS_ROOTS`

Accepted format is comma and/or newline separated absolute paths.

Example:

```bash
SF_PRETTIER_EXTRA_CORPUS_ROOTS="/abs/corpus-a,/abs/corpus-b" pnpm --filter prettier-plugin-salesforce test -- tests/corpus/multi-corpus-smoke-contract.test.ts
```

If a corpus root is a container where each direct child directory is a
separate project, force project-pack expansion with:

- `SF_PRETTIER_PROJECT_PACK_ROOTS`
- `SF_PRETTIER_PROJECT_PACK_ROOT` (single root override)

Example:

```bash
SF_PRETTIER_EXTRA_CORPUS_ROOTS="/abs/customer-corpus" \
SF_PRETTIER_PROJECT_PACK_ROOTS="/abs/customer-corpus" \
pnpm --filter prettier-plugin-salesforce test -- tests/corpus/multi-corpus-smoke-contract.test.ts
```

Single-root override example:

```bash
SF_PRETTIER_PROJECT_PACK_ROOT="/abs/customer-corpus" \
pnpm --filter prettier-plugin-salesforce test -- tests/corpus/project-pack-*.test.ts
```

## Plugin Option

`prettier-plugin-salesforce` routes Salesforce-owned files only. This is the
default and only routing behavior. Non-Salesforce project files are left outside
the plugin route.

The plugin exposes Salesforce-specific label sort options:

| Option | Default | Scope |
| --- | --- | --- |
| `salesforceSortLabelsByFullName` | `false` | Sorts `<labels>` blocks in `CustomLabels` metadata by nested `<fullName>` when enabled. Applies to `.labels`, `.labels-meta.xml`, and `.labels-meta.xml.tmp` paths. |
| `salesforceSortLabelEntriesByFullName` | `false` | Legacy alias for `salesforceSortLabelsByFullName`. |

Example `.prettierrc`:

```json
{
  "plugins": ["prettier-plugin-salesforce"],
  "salesforceSortLabelsByFullName": true
}
```

Default behavior keeps label order as authored:

```json
{
  "plugins": ["prettier-plugin-salesforce"],
  "salesforceSortLabelsByFullName": false
}
```

## Metadata Parser Overrides

Parser names:

| Parser | Use |
| --- | --- |
| `salesforce-apex` | Apex classes and triggers. |
| `salesforce-apex-anonymous` | Anonymous Apex scripts. |
| `salesforce-markup` | Visualforce and Aura markup. |
| `salesforce-metadata-xml` | Salesforce metadata XML and metadata suffix files. |
| `salesforce-router-by-path` | Path-aware router for shared Salesforce extensions such as `.html`, `.md`, `.xml`, `.svg`, and `.app`. |

Do not set `parser` at the top level of a Prettier config. Use parser
overrides only inside `overrides`.

Some Salesforce repos ship a local `.prettierrc` override that maps `*.xml` to
Prettier core `html`. In those projects, `prettier.getFileInfo()` can report
`html` for Salesforce metadata sidecars like `*.field-meta.xml`.

The plugin still supports those files. To force plugin metadata behavior in
that setup, add a narrower override for Salesforce sidecars:

```json
{
  "overrides": [
    {
      "files": ["**/*-meta.xml", "**/*.labels", "**/*.labels-meta.xml"],
      "options": { "parser": "salesforce-metadata-xml" }
    }
  ]
}
```

Keep the sidecar override after any broad `*-meta.xml` override, so it wins:

```json
{
  "overrides": [
    { "files": "**/*-meta.xml", "options": { "parser": "html" } },
    {
      "files": ["**/*-meta.xml", "**/*.labels", "**/*.labels-meta.xml"],
      "options": { "parser": "salesforce-metadata-xml" }
    }
  ]
}
```

## Programmatic APIs

Exports:

- `routeFile(filePath)` for deterministic Salesforce-owned route classification.
- `prettier-plugin-salesforce/config-audit` for risky override detection.
- `prettier-plugin-salesforce/config-audit/scan` for workspace-level audit scanning.
- `prettier-plugin-salesforce/config-audit/cli` and `prettier-plugin-salesforce/audit` for human/JSON output formatting.

Current corpus contracts also verify runtime equivalence for known config-aware
override projects, so parser label drift without output drift stays visible.
They also pin the discovered `**/*-meta.xml -> html` override policy so config
changes that can retire that frontier are visible immediately.

You can also audit repo config programmatically:

```ts
import { auditPrettierConfig } from "prettier-plugin-salesforce/config-audit";

const findings = auditPrettierConfig(prettierConfigObject);
if (findings.length > 0) {
  // add salesforce-metadata-xml sidecar override
}
```

To scan a whole workspace tree:

```ts
import { scanPrettierConfigAuditReports } from "prettier-plugin-salesforce/config-audit/scan";

const reports = await scanPrettierConfigAuditReports("/abs/path/to/workspace");
```

Or run the package command directly:

```bash
pnpm --filter prettier-plugin-salesforce audit:configs /abs/path/to/workspace
```

To apply safe automatic fixes for risky configs:

```bash
pnpm --filter prettier-plugin-salesforce audit:configs --apply-fixes /abs/path/to/workspace
```

Current auto-fix support covers:

- `.prettierrc`
- `.prettierrc.json`
- `.prettierrc.json5`
- `.prettierrc.yaml`
- `.prettierrc.yml`
- `.prettierrc.toml`
- `.prettierrc.js`
- `.prettierrc.cjs`
- `.prettierrc.mjs`
- `.prettierrc.ts`
- `.prettierrc.mts`
- `.prettierrc.cts`
- `prettier.config.js`
- `prettier.config.cjs`
- `prettier.config.mjs`
- `prettier.config.ts`
- `prettier.config.mts`
- `prettier.config.cts`
- `package.json` (`prettier` block)

Configs outside the supported set are still reported, but not auto-modified.

For CI annotations and machine parsing:

```bash
pnpm --filter prettier-plugin-salesforce audit:configs --json /abs/path/to/workspace
```

When `--apply-fixes` and `--json` are combined, the JSON payload includes
`fixSummary` with per-config actions (`fixed` or `skipped`) and explicit
reasons (`updated`, `unsupported-config-format`, `parse-or-write-failed`, or
`no-change`).

If the scanner encounters a supported config it cannot parse, it emits a
`config-file-unreadable` finding so coverage gaps stay explicit. Configs
outside the supported set are reported when found, but not auto-modified.
