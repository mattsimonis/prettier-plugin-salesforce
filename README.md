# prettier-plugin-salesforce

Prettier plugin for Salesforce source files.

Site: https://mattsimonis.github.io/prettier-plugin-salesforce/

It formats Salesforce-owned files and leaves ordinary project files to Prettier
core or other plugins.

## Supported files

| Surface                               | Files                                                                                    |
| ------------------------------------- | ---------------------------------------------------------------------------------------- |
| Apex                                  | `.cls`, `.trigger`, anonymous `.apex` files                                              |
| Visualforce                           | `.page`, `.component`                                                                    |
| Aura markup                           | `.cmp`, `.intf`, `.tokens`, `.evt`, `.design`, `.auradoc`, Aura `.app`                   |
| LWC templates                         | `.html` files under an `lwc` path segment                                                |
| LWC, Aura, and static resource assets | Delegated JS, TS, CSS, JSON, YAML, Markdown, and HTML text assets                        |
| Salesforce metadata XML               | `*-meta.xml`, `.labels`, known metadata family suffix files, and metadata XML paths      |
| Salesforce payload text               | `.email`, `.resource`, `.asset`, `.forceignore`, and known Salesforce payload text paths |

See [docs/file-routing.md](docs/file-routing.md) for the full route table and
path rules.

## Requirements

- Node.js 22 or newer for this repository.
- pnpm 11.2.2 for local development.
- Prettier 3 in projects that consume the plugin.

## Use in a Salesforce project

Install the plugin beside Prettier:

```bash
pnpm add -D prettier prettier-plugin-salesforce
```

Add the plugin to `.prettierrc`:

```json
{
  "plugins": ["prettier-plugin-salesforce"]
}
```

Format Salesforce files:

```bash
pnpm prettier --write "force-app/**/*"
```

Check formatting in CI:

```bash
pnpm prettier --check "force-app/**/*"
```

If your repo has broad parser overrides, keep Salesforce-specific overrides after
them so the narrower rule wins:

```json
{
  "plugins": ["prettier-plugin-salesforce"],
  "overrides": [
    { "files": "**/*-meta.xml", "options": { "parser": "html" } },
    {
      "files": ["**/*-meta.xml", "**/*.labels", "**/*.labels-meta.xml"],
      "options": { "parser": "salesforce-metadata-xml" }
    }
  ]
}
```

Do not set a top-level `parser` in a shared Prettier config. Use parser
overrides only where a file family needs one.

## Plugin options

| Option                                 | Default         | Use                                                                                                                                  |
| -------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `salesforceSortLabelsByFullName`       | `false`         | Sort `<labels>` blocks in `CustomLabels` metadata by nested `<fullName>`.                                                            |
| `salesforceFinalNewline`               | `true`          | Print one trailing newline at the end of Salesforce-formatted files.                                                                 |
| `salesforceTestVisiblePlacement`       | `"own-line"`    | Print Apex `@TestVisible` on its own line. Use `"inline"` to keep it with the declaration.                                           |
| `salesforceBlankLineBeforeLineComment` | `false`         | Add an empty line before standalone Apex `//` comments, except first comments in a block and comments directly after block comments. |
| `salesforceLogicalOperatorPosition`    | `"end-of-line"` | Put wrapped Apex logical operators at the end of the previous line. Use `"start-of-line"` for leading operators.                     |

Example:

```json
{
  "plugins": ["prettier-plugin-salesforce"],
  "printWidth": 120,
  "salesforceLogicalOperatorPosition": "end-of-line",
  "salesforceBlankLineBeforeLineComment": false
}
```

## Parser names

Most users should let Prettier infer parsers by path. Parser names are available
for targeted overrides:

| Parser                      | Use                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `salesforce-apex`           | Apex classes and triggers.                                                                  |
| `salesforce-apex-anonymous` | Anonymous Apex scripts.                                                                     |
| `salesforce-markup`         | Visualforce and Aura markup.                                                                |
| `salesforce-metadata-xml`   | Salesforce metadata XML and metadata suffix files.                                          |
| `salesforce-router-by-path` | Path-aware router for shared extensions such as `.html`, `.md`, `.xml`, `.svg`, and `.app`. |

## Config audit

The package includes a config-audit command for Salesforce repos with risky
Prettier overrides:

```bash
pnpm --filter prettier-plugin-salesforce audit:configs /abs/path/to/workspace
```

Apply supported safe fixes:

```bash
pnpm --filter prettier-plugin-salesforce audit:configs --apply-fixes /abs/path/to/workspace
```

Machine-readable output:

```bash
pnpm --filter prettier-plugin-salesforce audit:configs --json /abs/path/to/workspace
```

Auto-fix support covers common `.prettierrc*`, `prettier.config.*`, and
`package.json` Prettier blocks. Unsupported config formats are reported but not
modified.

## Programmatic APIs

```ts
import { routeFile } from "prettier-plugin-salesforce";
import { auditPrettierConfig } from "prettier-plugin-salesforce/config-audit";
import { scanPrettierConfigAuditReports } from "prettier-plugin-salesforce/config-audit/scan";
```

- `routeFile(filePath)` returns the Salesforce route for a path.
- `auditPrettierConfig(config)` reports risky parser overrides.
- `scanPrettierConfigAuditReports(root)` scans a workspace tree.

## Develop this repository

Install dependencies:

```bash
pnpm install
```

Build all packages:

```bash
pnpm build
```

Run tests:

```bash
pnpm test
```

Run the main plugin tests only:

```bash
pnpm --filter prettier-plugin-salesforce test
```

Run Apex printer tests while iterating on Apex formatting:

```bash
pnpm --filter prettier-plugin-salesforce exec vitest run src/apex/printer.test.ts
```

Run type checks without emitting files:

```bash
pnpm lint
```

## Playground

Run the local formatter playground:

```bash
pnpm playground:dev
```

Build static playground files:

```bash
pnpm playground:build
```

Preview the static build:

```bash
pnpm playground:preview
```

The build output goes to `packages/playground/dist`. The GitHub Pages workflow
is [`.github/workflows/playground-pages.yml`](.github/workflows/playground-pages.yml).
Publishing steps are in [docs/publishing.md](docs/publishing.md).

## Corpus and benchmarks

Primary corpus tests read `SF_PRETTIER_CORPUS_ROOT` when set. Multi-corpus
contracts use `SF_PRETTIER_DEFAULT_CORPUS_ROOT` plus
`SF_PRETTIER_EXTRA_CORPUS_ROOTS`.

Example:

```bash
SF_PRETTIER_EXTRA_CORPUS_ROOTS="/abs/corpus-a,/abs/corpus-b" \
pnpm --filter prettier-plugin-salesforce test -- tests/corpus/multi-corpus-smoke-contract.test.ts
```

Run the benchmark package:

```bash
pnpm bench packages/prettier-plugin-salesforce/tests --plugin
```

See [docs/performance-budget.md](docs/performance-budget.md) and
[docs/release-gate.md](docs/release-gate.md) for pre-release checks.

## Project docs

- [docs/architecture.md](docs/architecture.md): formatter architecture and safety model.
- [docs/file-routing.md](docs/file-routing.md): route table, parser boundaries, and shared extension behavior.
- [docs/performance-budget.md](docs/performance-budget.md): timing targets and benchmark report fields.
- [docs/release-gate.md](docs/release-gate.md): commands required before the first publish.
- [docs/publishing.md](docs/publishing.md): GitHub Pages, repository, and npm publish steps.
- [docs/native-fallback.md](docs/native-fallback.md): non-default fallback worker protocol notes.
