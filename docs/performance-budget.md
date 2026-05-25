# Performance Budget

The default formatter path must feel like ordinary Prettier.

## Targets

- Warm Apex single-file format: less than 50 ms.
- Save-on-format path for common Salesforce files: less than 100 ms.
- Full project check: bounded worker count, stable memory, no Java server.
- Default path: no per-file external process.

## First Baseline

Run this before adding formatter code:

```sh
pnpm bench ./corpus
```

Record:

- file count
- formatted count
- failed count
- wall ms
- ms per file
- CPU ms
- RSS MB
- family files (apex/markup/xml/other)
- family failed count and fail %
- family input KB and output KB

The first report is a measuring stick, not a pass/fail gate.

## Corpus Gate

Run:

```sh
pnpm bench ./corpus --plugin
```

Release candidates must record warm run results here before publishing.

## Report Field Notes

The benchmark report now prints two tables.

- Summary table (existing): one row per run with total timing and memory.
- Family table (new): one row per file family (`apex`, `markup`, `xml`, `other`).

Family definitions:

- `apex`: `.cls`, `.trigger`, `.apex`
- `markup`: `.page`, `.component`, `.cmp`, `.app`, `.evt`, `.design`, `.auradoc`, and LWC-path `.html`
- `xml`: `.xml`
- `other`: `.js`, `.ts`, `.css`, `.json`, and other included extensions not in the three groups above

Interpretation notes:

- Use family `files` to track corpus mix drift between runs.
- Use family `fail_pct` to spot regressions hidden by strong global totals.
- Compare family `input_kb` and `output_kb` to catch shape changes in formatter output.
- Keep the summary table as the release gate for wall time, CPU, and memory.

## Safety Cost Notes

- ApexDoc-aware Apex formatting is now part of the default path and must stay
  within the same warm-file budget.
- Markup safety rules add dialect checks and guarded inline expansion; keep this
  in the save-on-format budget.
- Metadata XML now runs structure-signature checks and a second-pass idempotence
  check; keep this in budget while preserving fallback correctness.
- The fallback matrix now includes encoded plus CDATA edge mixes across
  permissionset/profile/layout/flow/object/labels/translation families; keep
  those guard fixtures in the xml-focused test pass without widening runtime.
