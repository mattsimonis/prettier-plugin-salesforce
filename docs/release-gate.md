# Pre-Release Gate

Run the gate before the first publish and before each later publish.

## Prerequisites

Install dependencies from the repository root:

```sh
pnpm install
```

Optional environment variables:

- `SF_PRETTIER_CORPUS_ROOT`: main Salesforce corpus root.
- `SF_PRETTIER_EXTRA_CORPUS_ROOTS`: comma-separated extra corpus roots.
- `SF_PRETTIER_BENCH_ROOT`: benchmark input root. Defaults to
  `packages/prettier-plugin-salesforce/tests`.

## Command

```sh
pnpm release:check
```

The release gate runs:

1. `pnpm build`
2. `pnpm --filter @prettier-salesforce/benchmarks test`
3. `pnpm --filter prettier-plugin-salesforce test`
4. `pnpm lint`
5. `pnpm --filter prettier-plugin-salesforce exec npm pack --dry-run --json`
6. `pnpm --filter @prettier-salesforce/benchmarks bench "$SF_PRETTIER_BENCH_ROOT" --plugin --release`

Run the same pieces by hand when narrowing a failure:

```sh
pnpm build
pnpm --filter @prettier-salesforce/benchmarks test
pnpm --filter prettier-plugin-salesforce test
pnpm lint
pnpm --filter prettier-plugin-salesforce exec npm pack --dry-run --json
pnpm --filter @prettier-salesforce/benchmarks bench packages/prettier-plugin-salesforce/tests --plugin --release
```

## Required Evidence

- Warm Apex single-file time stays under 50 ms.
- Save-on-format path stays under 100 ms on sample Apex, LWC HTML, Visualforce, and metadata XML.
- Corpus smoke and route-invariant tests pass.
- Format-twice idempotence passes.
- Benchmark family table includes `apex`, `markup`, `xml`, and `other` rows with non-negative counters.
- Metadata XML fallback matrix stays complete across the guarded families.
- Payload text routes stay pinned for `.email`, `.resource`, `.asset`, Agentforce authoring payloads, and `.forceignore`.
- Ordinary project text routes stay outside Salesforce ownership.
- Metadata family routes stay pinned for `.labels`, `.object`, and metadata suffixes.
- Npm pack dry run includes the package README, license, browser build, audit entrypoints, and package export map.
- Default formatting path uses no Java process or HTTP server.
- Full benchmark report is attached to the release pull request or publish notes.

## Evidence Files

Release artifacts are written under `.release-evidence/`:

- `benchmark.json`

The JSON report is the machine-readable gate input. Attach it, or a short
summary made from it, to the release pull request or publish notes.

## Supported Paths

Full formatter paths:

- Apex `.cls`, `.trigger`, and anonymous Apex `.apex` use the in-process parser and printer.
- Visualforce and Aura markup use dialect-aware inline-expression safety rules.
- LWC template HTML formats only for `.html` paths in an `lwc` path segment.
- Salesforce metadata XML uses a conservative formatter with declaration, comment, and order safeguards.

Guarded formatter paths:

- Metadata XML keeps original text when safety checks fail.
- Markup inline-expression expansion applies only to safe single-line expression blocks.
- Shared extensions route by Salesforce path. Ordinary project files remain outside plugin ownership.

## Failure Policy

The package is not ready to publish if any gate command fails or if the
benchmark report shows a hard budget failure. Soft warnings should be called out
when they reflect known corpus or environment differences.
