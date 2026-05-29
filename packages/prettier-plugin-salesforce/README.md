# prettier-plugin-salesforce

Prettier plugin for Salesforce Apex, Visualforce, Aura, LWC templates, and
Salesforce metadata XML.

## Install

```bash
pnpm add -D prettier prettier-plugin-salesforce
```

Use the matching command for npm or Yarn if your project uses one of those
package managers.

## Configure

Add the plugin to `.prettierrc`:

```json
{
  "plugins": ["prettier-plugin-salesforce"]
}
```

Format Salesforce source:

```bash
pnpm prettier --write "force-app/**/*"
```

Check formatting in CI:

```bash
pnpm prettier --check "force-app/**/*"
```

Do not set a top-level `parser` in a shared Prettier config. Use targeted
overrides only when a file family needs a parser forced.

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

The plugin owns Salesforce paths only. Ordinary project files stay with Prettier
core, another plugin, or no parser.

## Options

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
  "salesforceSortLabelsByFullName": false,
  "salesforceLogicalOperatorPosition": "end-of-line"
}
```

## Parser overrides

Most projects should let Prettier infer parsers. If your repo has broad parser
overrides, put Salesforce-specific overrides later so they win:

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

Available parser names:

| Parser                      | Use                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `salesforce-apex`           | Apex classes and triggers.                                                                  |
| `salesforce-apex-anonymous` | Anonymous Apex scripts.                                                                     |
| `salesforce-markup`         | Visualforce and Aura markup.                                                                |
| `salesforce-metadata-xml`   | Salesforce metadata XML and metadata suffix files.                                          |
| `salesforce-router-by-path` | Path-aware router for shared extensions such as `.html`, `.md`, `.xml`, `.svg`, and `.app`. |

## Config audit APIs

The package exports helpers for finding risky Prettier overrides in Salesforce
workspaces. The source repository also has a local `audit:configs` script for
maintainers.

## Programmatic APIs

```ts
import { routeFile } from "prettier-plugin-salesforce";
import { auditPrettierConfig } from "prettier-plugin-salesforce/config-audit";
import { scanPrettierConfigAuditReports } from "prettier-plugin-salesforce/config-audit/scan";
```

- `routeFile(filePath)` returns the Salesforce route for a path.
- `auditPrettierConfig(config)` reports risky parser overrides.
- `scanPrettierConfigAuditReports(root)` scans a workspace tree.

For repository development, release checks, playground use, and deep routing
notes, see the project README and `docs/` directory.
