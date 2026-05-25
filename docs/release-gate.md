# Release Gate

Run these commands before publishing:

```sh
pnpm install
pnpm release:check
```

## Required Evidence

- warm Apex single-file time under 50 ms
- save-on-format path under 100 ms on sample Apex, LWC HTML, Visualforce, and metadata XML
- corpus smoke passes
- corpus route invariants pass for supported families (`.cls`, `.trigger`, `.page`, `.component`, `.cmp`, LWC `.js`, optional LWC `.html` when present, metadata `.xml`)
- payload text routes stay pinned (`.email`, `.resource`, `.asset`, Agentforce authoring payloads in AI bundle paths, and `.forceignore` -> `payload-text`)
- ordinary project text routes stay outside Salesforce ownership (`.txt`, `.cfg`, `.sql`, `.soql`, `.csv`, `.log`, `.notes`, `.dwl`, `.schema`, scripts, `.env`, `.toml`, lockfiles, CODEOWNERS, and hooks -> `unknown` or Prettier core)
- metadata family routes stay pinned (`.labels` and `.object` under metadata-family paths -> `metadata-xml`; legacy family suffixes such as `.namedCredential` and `.remoteSite` -> `metadata-xml`)
- corpus contracts stay green: `project-pack-intentional-unknown-policy-contract`, `project-pack-salesforce-text-route-contract`, and `project-pack-unknown-binary-frontier-contract`
- metadata frontier ledgers stay complete for corpora (`primaryCorpus-metadata-frontier-triage-contract`, `project-pack-metadata-frontier-triage-contract`)
- metadata frontier emptiness checks stay green (`project-pack-metadata-frontier-directory-emptiness-contract`)
- metadata extension routing checks stay green (`project-pack-metadata-extension-route-contract`)
- Salesforce Apex/markup/text/metadata/core inference checks stay green (`project-pack-salesforce-apex-inference-contract`, `project-pack-salesforce-markup-inference-contract`, `project-pack-salesforce-text-route-contract`, `project-pack-salesforce-metadata-inference-contract`, `project-pack-salesforce-core-inference-contract`)
- non-unknown inference-null frontier stays pinned to approved exceptions (`project-pack-nonunknown-inference-null-frontier-contract`)
- unknown extension inventory stays explicit (`project-pack-unknown-extension-inventory-contract`)
- benchmark family table checks pass: `apex`, `markup`, `xml`, and `other` rows stay present with non-negative counters
- metadata fallback matrix stays complete across families with parallel `encoded`, `encoded+cdata`, and `mixed` variants where practical
- full benchmark report attached to release notes
- npm pack dry run includes package README, license, browser build, audit entrypoints, and package export map
- no Java or HTTP server in default path
- format-twice idempotence passes

## Support Status Snapshot

Current full paths:

- Apex `.cls`, `.trigger`, and anonymous Apex `.apex` on in-process parser/printer path
- Visualforce and Aura markup formatting with dialect-aware inline-expression safety rules
- LWC template HTML formatting only for `.html` paths in an `lwc` path segment
- Metadata XML conservative formatter for Salesforce metadata `.xml` paths with declaration/comment/order safeguards

Current limited paths:

- Metadata XML keeps original text when safety checks fail (raw text `<`, order drift risk, attribute-shape drift, or non-idempotent second pass)
- Markup inline-expression expansion applies only to safe single-line expression blocks; other inline text stays as-is
