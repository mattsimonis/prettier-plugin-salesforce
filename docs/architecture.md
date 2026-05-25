# Architecture

The default formatter path runs inside Node.

## Apex Parser Decision

Start with an in-process Apex CST facade. It gives the Prettier plugin tokens,
comments, source ranges, diagnostics, and a stable document shape without Java
or a side server. A tree-sitter WASM package remains the packaging target once
the grammar bundle is produced.

## Why Not Jorje

The old formatter asks `jorje` for an AST through a Java/native serializer. That
keeps platform parse fidelity, but it costs process startup, server setup, and
large AST repair work. A normal Prettier formatter should not need a side
process for save-on-format.

## Why Primary corpus Parser Material

`apex-tree-sitter-parser` already carries a tree-sitter Apex grammar and has local
evidence around fast parsing. The formatter still needs a broader CST contract:
all tokens, comments, syntax errors, and stable ranges.

## Current Behavior After Safety Waves

The Apex path keeps source tokens in-process and now has explicit ApexDoc
attachment handling for declarations and inner members.

The markup path detects Visualforce, Aura, and LWC dialects from tag patterns.
Formatting starts with tag-shape layout, then applies dialect rules only when
an inline expression block is safe to expand.

The metadata XML path runs a conservative formatter. It accepts formatted output
only when structure and ordering signatures match the input and a second pass is
idempotent. Otherwise it returns the original XML text with a trailing newline.
For `CustomLabels`, optional sorting by `<fullName>` is controlled by
`salesforceSortLabelsByFullName` (default `false`). The old
`salesforceSortLabelEntriesByFullName` option remains as a legacy alias.

## Corpus Route Invariants

Corpus checks pin file-route behavior to extension and path families.
Supported families route to formatter paths (`.cls`/`.trigger` to Apex, markup
extensions to markup, LWC `/lwc/*.html` to LWC HTML, Salesforce metadata paths
to metadata XML, and `*-meta.xml`/`*.xml.tmp`/`sfdx-workspace.iml` directly to
the metadata parser). Legacy metadata suffix families (such as `.namedCredential`,
`.remoteSite`, `.permissionSetGroup`) route through `metadata-xml` when path
families match. Payload text families (`.email`, `.resource`, `.asset`) route
to pass-through normalization with one trailing newline. Unknown route checks
stay active on the full corpus to surface unsupported families as they appear.

Metadata family source-of-truth lives in `src/metadata-families.ts`. One directory-family
pattern and one metadata extension set define which legacy suffix files route
to `metadata-xml` outside plain `.xml` handling. Added families include
`permissionSetGroups`, `customPermissions`, `restrictionRules`, `scopingRules`,
`samlSsoConfigs`, `corsWhitelistOrigins`, `sites`, `networks`,
`standardValueSetTranslations`, `objectTranslations`, `compactLayouts`,
`fieldSets`, `businessProcesses`, `recordTypes`, `webLinks`, `validationRules`,
`sharingReasons`, `listViews`, `milestoneTypes`, and `milestones`, with
matching suffix support such as `.permissionSetGroup`, `.customPermission`,
`.restrictionRule`, `.scopingRule`, `.samlSsoConfig`, `.corsWhitelistOrigin`,
`.site`, `.network`, `.standardValueSetTranslation`, `.objectTranslation`,
`.compactLayout`, `.fieldset`, `.businessProcess`, `.recordType`, `.webLink`,
`.validationRule`, `.sharingReason`, `.listView`, `.milestoneType`,
and `.milestone`.

## Shared Extension Routing

Prettier infers parser choice from registered extensions and filenames. It does
not express full Salesforce path ownership in language registration. Shared
extensions such as `.html`, `.md`, `.xml`, `.svg`, and `.app` therefore use
`salesforce-router-by-path`.

The router checks `options.filepath`. Salesforce paths format through the
Salesforce parser. Non-Salesforce paths stay on Prettier core or `unknown`.
When a repository has its own broad parser override, set a narrower Salesforce
override after it:

```json
{
  "overrides": [
    {
      "files": "applications/**/*.app",
      "options": { "parser": "salesforce-metadata-xml" }
    },
    {
      "files": "aura/**/*.app",
      "options": { "parser": "salesforce-markup" }
    }
  ]
}
```
