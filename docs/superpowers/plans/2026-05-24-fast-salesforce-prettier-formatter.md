# Fast Salesforce Prettier Formatter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `prettier-plugin-salesforce`, a fast Prettier formatter for Salesforce development that covers Apex, Visualforce, LWC, Aura, and Salesforce metadata XML without a slow Java or per-file process path.

**Architecture:** Keep Prettier as the front door and make the default formatter path in-process. Route Salesforce-owned file types through one plugin, delegate Salesforce-owned LWC, Aura, and static resource assets to Prettier core where safe, and build a new Apex CST parser/printer around the `apex-tree-sitter-parser` tree-sitter grammar. Use any native or worker binary only as fallback, never as the default trail.

**Tech Stack:** Node 22+, TypeScript, Prettier 3, pnpm, Vitest, tree-sitter Apex grammar from `./apex-tree-sitter-parser`, optional WASM parser package, optional Go worker fallback, `@prettier/plugin-xml` or a Salesforce-safe XML printer after a spike.

---

## Ground Truth

- Current `prettier-plugin-apex` formats only Apex language entries: `.cls`, `.trigger`, and anonymous `.apex`.
- Current Apex parsing depends on `jorje` through `apex-ast-serializer`; default native mode still spawns a parser process for a file.
- The built-in server avoids repeated Java startup but asks users to run a side server. That does not feel like ordinary Prettier.
- `apex-tree-sitter-parser` parses Apex with tree-sitter. Fresh local bench on Apple M2 Pro: `BenchmarkParseClass-12`, 646 runs, `1695081 ns/op`, `165864 B/op`, `2380 allocs/op`.
- `apex-tree-sitter-parser` currently extracts declarations. A formatter needs full CST nodes, tokens, comments, ranges, errors, and stable traversal.
- `primaryCorpus` has Salesforce-shaped fixture material under `./corpus`, including Apex, Visualforce pages/components, Aura, LWC JS, and metadata XML.

## Product Bar

- Warm single-file Apex format: target `<50 ms` inside Node.
- Save-on-format path: target `<100 ms` wall time for a normal file.
- Project check: bounded parallel workers, no fan-racing CPU storm, stable memory.
- Default path: no Java, no HTTP server, no per-file external process.
- Idempotence: format once, format twice, same bytes.
- Safety: parse before and after for Apex; for metadata XML, preserve semantic order unless a rule has a fixture.
- Familiarity: users run `prettier --write force-app` and do not learn a Salesforce-only ritual.

## Proposed File Structure

- Create: `package.json` - root package scripts and workspace metadata.
- Create: `pnpm-workspace.yaml` - workspace list.
- Create: `tsconfig.base.json` - shared TypeScript settings.
- Create: `packages/prettier-plugin-salesforce/package.json` - plugin package.
- Create: `packages/prettier-plugin-salesforce/src/index.ts` - Prettier plugin exports.
- Create: `packages/prettier-plugin-salesforce/src/languages.ts` - Salesforce language definitions and extension routing.
- Create: `packages/prettier-plugin-salesforce/src/parsers/router.ts` - parser choice by filepath and explicit parser.
- Create: `packages/prettier-plugin-salesforce/src/printers/router.ts` - printer choice by AST format.
- Create: `packages/prettier-plugin-salesforce/src/apex/parser.ts` - Apex CST parser adapter.
- Create: `packages/prettier-plugin-salesforce/src/apex/printer.ts` - Apex CST printer.
- Create: `packages/prettier-plugin-salesforce/src/apex/comments.ts` - Apex comment attachment and ignore handling.
- Create: `packages/prettier-plugin-salesforce/src/apex/ast.ts` - internal Apex AST/CST types.
- Create: `packages/prettier-plugin-salesforce/src/apex/wasm.ts` - in-process WASM parser loader.
- Create: `packages/prettier-plugin-salesforce/src/apex/fallback-worker.ts` - optional persistent worker fallback.
- Create: `packages/prettier-plugin-salesforce/src/markup/parser.ts` - Visualforce/Aura/LWC markup parser adapter.
- Create: `packages/prettier-plugin-salesforce/src/markup/printer.ts` - Salesforce markup printer.
- Create: `packages/prettier-plugin-salesforce/src/xml/parser.ts` - metadata XML parser adapter.
- Create: `packages/prettier-plugin-salesforce/src/xml/printer.ts` - metadata XML printer.
- Create: `packages/prettier-plugin-salesforce/tests/run-spec.ts` - fixture runner.
- Create: `packages/prettier-plugin-salesforce/tests/apex/basic/Basic.cls` - first Apex fixture.
- Create: `packages/prettier-plugin-salesforce/tests/apex/basic/jsfmt.spec.ts` - first Apex spec.
- Create: `packages/prettier-plugin-salesforce/tests/metadata/basic/Widget__c.object-meta.xml` - first metadata fixture.
- Create: `packages/prettier-plugin-salesforce/tests/metadata/basic/jsfmt.spec.ts` - first metadata spec.
- Create: `packages/prettier-plugin-salesforce/tests/markup/basic/AccountView.page` - first Visualforce fixture.
- Create: `packages/prettier-plugin-salesforce/tests/markup/basic/jsfmt.spec.ts` - first markup spec.
- Create: `packages/benchmarks/package.json` - benchmark package.
- Create: `packages/benchmarks/src/collect-corpus.ts` - corpus file collector.
- Create: `packages/benchmarks/src/run-format-benchmark.ts` - benchmark runner.
- Create: `packages/benchmarks/src/report.ts` - benchmark report writer.
- Create: `packages/apex-parser-wasm/package.json` - WASM parser package, if the spike passes.
- Create: `packages/apex-parser-wasm/src/index.ts` - parser package API.
- Create: `packages/apex-parser-worker/go.mod` - fallback worker module, only if needed.
- Create: `packages/apex-parser-worker/cmd/apex-parser-worker/main.go` - fallback worker binary.
- Create: `docs/architecture.md` - architecture notes and parser path decisions.
- Create: `docs/performance-budget.md` - measured budgets and gates.
- Create: `docs/file-routing.md` - supported file types and parser routing.

## Task 1: Scaffold The Workspace

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `packages/prettier-plugin-salesforce/package.json`
- Create: `packages/prettier-plugin-salesforce/tsconfig.json`
- Create: `packages/prettier-plugin-salesforce/src/index.ts`
- Create: `packages/prettier-plugin-salesforce/src/languages.ts`

- [ ] **Step 1: Write root workspace files**

Create `package.json`:

```json
{
  "name": "prettier-plugin-salesforce-workspace",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.2.2",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "bench": "pnpm --filter @prettier-salesforce/benchmarks bench"
  },
  "devDependencies": {
    "@types/node": "^22.19.0",
    "prettier": "^3.8.3",
    "typescript": "^6.0.0",
    "vitest": "^4.1.0"
  }
}
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "packages/*"
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 2: Create the plugin package**

Create `packages/prettier-plugin-salesforce/package.json`:

```json
{
  "name": "prettier-plugin-salesforce",
  "version": "0.0.0",
  "type": "module",
  "exports": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "lint": "tsc -p tsconfig.json --noEmit"
  },
  "peerDependencies": {
    "prettier": "^3.0.0"
  },
  "devDependencies": {
    "prettier": "^3.8.3",
    "typescript": "^6.0.0",
    "vitest": "^4.1.0"
  }
}
```

Create `packages/prettier-plugin-salesforce/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Add first plugin exports**

Create `packages/prettier-plugin-salesforce/src/languages.ts`:

```ts
import type { SupportLanguage } from "prettier";

export const languages: SupportLanguage[] = [
  {
    name: "Salesforce Apex",
    parsers: ["salesforce-apex"],
    extensions: [".cls", ".trigger"],
    vscodeLanguageIds: ["apex"],
  },
  {
    name: "Salesforce Anonymous Apex",
    parsers: ["salesforce-apex-anonymous"],
    extensions: [".apex"],
    vscodeLanguageIds: ["apex-anon"],
  },
  {
    name: "Salesforce Visualforce",
    parsers: ["salesforce-markup"],
    extensions: [".page", ".component"],
    vscodeLanguageIds: ["visualforce"],
  },
  {
    name: "Salesforce Aura Markup",
    parsers: ["salesforce-markup"],
    extensions: [".cmp", ".app", ".evt", ".design", ".auradoc"],
    vscodeLanguageIds: ["auramarkup"],
  },
  {
    name: "Salesforce Metadata XML",
    parsers: ["salesforce-metadata-xml"],
    filenames: [],
    extensions: [".xml"],
    vscodeLanguageIds: ["xml"],
  },
];
```

Create `packages/prettier-plugin-salesforce/src/index.ts`:

```ts
import type { Plugin } from "prettier";
import { languages } from "./languages.js";

export const plugin: Plugin = {
  languages,
  parsers: {},
  printers: {},
};

export default plugin;
```

- [ ] **Step 4: Verify scaffold builds**

Run:

```sh
pnpm install
pnpm --filter prettier-plugin-salesforce build
```

Expected:

```text
Done
```

- [ ] **Step 5: Commit**

```sh
git add package.json pnpm-workspace.yaml tsconfig.base.json packages/prettier-plugin-salesforce
git commit -m "chore: scaffold salesforce prettier plugin"
```

## Task 2: Build The Benchmark Harness First

**Files:**

- Create: `packages/benchmarks/package.json`
- Create: `packages/benchmarks/tsconfig.json`
- Create: `packages/benchmarks/src/collect-corpus.ts`
- Create: `packages/benchmarks/src/report.ts`
- Create: `packages/benchmarks/src/run-format-benchmark.ts`
- Create: `docs/performance-budget.md`

- [ ] **Step 1: Create benchmark package**

Create `packages/benchmarks/package.json`:

```json
{
  "name": "@prettier-salesforce/benchmarks",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "bench": "tsx src/run-format-benchmark.ts"
  },
  "dependencies": {
    "prettier": "^3.8.3"
  },
  "devDependencies": {
    "@types/node": "^22.19.0",
    "tsx": "^4.22.0",
    "typescript": "^6.0.0"
  }
}
```

Create `packages/benchmarks/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 2: Write corpus collector**

Create `packages/benchmarks/src/collect-corpus.ts`:

```ts
import { readdir } from "node:fs/promises";
import path from "node:path";

const SALESFORCE_EXTENSIONS = new Set([
  ".cls",
  ".trigger",
  ".apex",
  ".page",
  ".component",
  ".cmp",
  ".app",
  ".evt",
  ".design",
  ".auradoc",
  ".html",
  ".js",
  ".ts",
  ".css",
  ".json",
  ".xml",
]);

export type CorpusFile = {
  path: string;
  extension: string;
};

export async function collectCorpus(root: string): Promise<CorpusFile[]> {
  const out: CorpusFile[] = [];
  await walk(root, out);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

async function walk(dir: string, out: CorpusFile[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, out);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const extension = path.extname(entry.name);
    if (SALESFORCE_EXTENSIONS.has(extension)) {
      out.push({ path: fullPath, extension });
    }
  }
}
```

- [ ] **Step 3: Write benchmark reporter**

Create `packages/benchmarks/src/report.ts`:

```ts
export type BenchmarkResult = {
  label: string;
  fileCount: number;
  formattedCount: number;
  failedCount: number;
  inputBytes: number;
  outputBytes: number;
  wallMs: number;
  cpuUserMs: number;
  cpuSystemMs: number;
  rssBytes: number;
};

export function printReport(results: BenchmarkResult[]): void {
  const rows = results.map((result) => ({
    label: result.label,
    files: result.fileCount,
    formatted: result.formattedCount,
    failed: result.failedCount,
    wall_ms: Math.round(result.wallMs),
    ms_per_file: round(result.wallMs / Math.max(result.fileCount, 1)),
    cpu_ms: Math.round(result.cpuUserMs + result.cpuSystemMs),
    rss_mb: round(result.rssBytes / 1024 / 1024),
    input_kb: round(result.inputBytes / 1024),
    output_kb: round(result.outputBytes / 1024),
  }));
  console.table(rows);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
```

- [ ] **Step 4: Write runner**

Create `packages/benchmarks/src/run-format-benchmark.ts`:

```ts
import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import prettier from "prettier";
import { collectCorpus } from "./collect-corpus.js";
import { printReport, type BenchmarkResult } from "./report.js";

const root = process.argv[2] ?? "./corpus";

async function main(): Promise<void> {
  const files = await collectCorpus(root);
  const result = await runPrettierCore(files.map((file) => file.path));
  printReport([result]);
}

async function runPrettierCore(paths: string[]): Promise<BenchmarkResult> {
  const startCpu = process.cpuUsage();
  const start = performance.now();
  let formattedCount = 0;
  let failedCount = 0;
  let inputBytes = 0;
  let outputBytes = 0;

  for (const filePath of paths) {
    const source = await readFile(filePath, "utf8");
    inputBytes += Buffer.byteLength(source);
    try {
      const formatted = await prettier.format(source, { filepath: filePath });
      outputBytes += Buffer.byteLength(formatted);
      formattedCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  const elapsed = performance.now() - start;
  const cpu = process.cpuUsage(startCpu);
  return {
    label: "prettier-core-baseline",
    fileCount: paths.length,
    formattedCount,
    failedCount,
    inputBytes,
    outputBytes,
    wallMs: elapsed,
    cpuUserMs: cpu.user / 1000,
    cpuSystemMs: cpu.system / 1000,
    rssBytes: process.memoryUsage().rss,
  };
}

await main();
```

- [ ] **Step 5: Write performance budget doc**

Create `docs/performance-budget.md`:

````md
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
````

Record:

- file count
- formatted count
- failed count
- wall ms
- ms per file
- CPU ms
- RSS MB

The first report is a measuring stick, not a pass/fail gate.

````

- [ ] **Step 6: Run the baseline**

Run:

```sh
pnpm bench ./corpus
````

Expected:

```text
prettier-core-baseline
```

and a table with file count, wall time, CPU time, and memory.

- [ ] **Step 7: Commit**

```sh
git add packages/benchmarks docs/performance-budget.md
git commit -m "chore: add salesforce formatter benchmark harness"
```

## Task 3: Add Salesforce File Routing

**Files:**

- Create: `packages/prettier-plugin-salesforce/src/parsers/router.ts`
- Create: `packages/prettier-plugin-salesforce/src/printers/router.ts`
- Modify: `packages/prettier-plugin-salesforce/src/index.ts`
- Create: `packages/prettier-plugin-salesforce/src/routing.ts`
- Create: `packages/prettier-plugin-salesforce/src/routing.test.ts`
- Create: `docs/file-routing.md`

- [ ] **Step 1: Write routing rules test**

Create `packages/prettier-plugin-salesforce/src/routing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { routeFile } from "./routing.js";

describe("routeFile", () => {
  it.each([
    ["force-app/main/default/classes/Foo.cls", "apex"],
    ["force-app/main/default/triggers/Foo.trigger", "apex"],
    ["scripts/run.apex", "apex-anonymous"],
    ["force-app/main/default/pages/AccountView.page", "markup"],
    ["force-app/main/default/components/Badge.component", "markup"],
    ["force-app/main/default/aura/Widget/Widget.cmp", "markup"],
    ["force-app/main/default/lwc/widget/widget.html", "lwc-html"],
    ["force-app/main/default/lwc/widget/widget.js", "prettier-core"],
    ["force-app/main/default/lwc/widget/widget.css", "prettier-core"],
    [
      "force-app/main/default/objects/Widget__c/Widget__c.object-meta.xml",
      "metadata-xml",
    ],
    ["force-app/main/default/flows/Widget.flow-meta.xml", "metadata-xml"],
  ])("routes %s", (filePath, expected) => {
    expect(routeFile(filePath)).toBe(expected);
  });
});
```

- [ ] **Step 2: Implement routing**

Create `packages/prettier-plugin-salesforce/src/routing.ts`:

```ts
import path from "node:path";

export type SalesforceRoute =
  | "apex"
  | "apex-anonymous"
  | "markup"
  | "lwc-html"
  | "metadata-xml"
  | "prettier-core"
  | "unknown";

const MARKUP_EXTENSIONS = new Set([
  ".page",
  ".component",
  ".cmp",
  ".app",
  ".evt",
  ".design",
  ".auradoc",
]);

export function routeFile(filePath: string): SalesforceRoute {
  const extension = path.extname(filePath);
  const normalized = filePath.replaceAll("\\", "/");

  if (extension === ".cls" || extension === ".trigger") {
    return "apex";
  }
  if (extension === ".apex") {
    return "apex-anonymous";
  }
  if (MARKUP_EXTENSIONS.has(extension)) {
    return "markup";
  }
  if (normalized.includes("/lwc/") && extension === ".html") {
    return "lwc-html";
  }
  if (
    normalized.includes("/lwc/") &&
    [".js", ".ts", ".css"].includes(extension)
  ) {
    return "prettier-core";
  }
  if (normalized.endsWith("-meta.xml") || normalized.includes("/objects/")) {
    return "metadata-xml";
  }
  if (extension === ".xml") {
    return "metadata-xml";
  }
  return "unknown";
}
```

- [ ] **Step 3: Add parser and printer router stubs**

Create `packages/prettier-plugin-salesforce/src/parsers/router.ts`:

```ts
import type { Parser } from "prettier";

export type SalesforceAst = {
  kind: "salesforce-router";
  route: string;
  text: string;
};

export function createParser(route: string): Parser<SalesforceAst> {
  return {
    astFormat: "salesforce-router",
    parse: (text) => ({ kind: "salesforce-router", route, text }),
    locStart: () => 0,
    locEnd: (node) => node.text.length,
  };
}
```

Create `packages/prettier-plugin-salesforce/src/printers/router.ts`:

```ts
import type { Printer } from "prettier";
import type { SalesforceAst } from "../parsers/router.js";

export const routerPrinter: Printer<SalesforceAst> = {
  print(path) {
    return path.node.text.trimEnd() + "\n";
  },
};
```

- [ ] **Step 4: Wire first plugin parsers**

Modify `packages/prettier-plugin-salesforce/src/index.ts`:

```ts
import type { Plugin } from "prettier";
import { languages } from "./languages.js";
import { createParser } from "./parsers/router.js";
import { routerPrinter } from "./printers/router.js";

export const plugin: Plugin = {
  languages,
  parsers: {
    "salesforce-apex": createParser("apex"),
    "salesforce-apex-anonymous": createParser("apex-anonymous"),
    "salesforce-markup": createParser("markup"),
    "salesforce-metadata-xml": createParser("metadata-xml"),
  },
  printers: {
    "salesforce-router": routerPrinter,
  },
};

export default plugin;
```

- [ ] **Step 5: Document routing**

Create `docs/file-routing.md`:

```md
# File Routing

`prettier-plugin-salesforce` routes Salesforce source by file path.

| Route          | Files                                                  | Formatter                                |
| -------------- | ------------------------------------------------------ | ---------------------------------------- |
| Apex           | `.cls`, `.trigger`                                     | New Apex CST formatter                   |
| Anonymous Apex | `.apex`                                                | New Apex CST formatter in anonymous mode |
| Visualforce    | `.page`, `.component`                                  | Salesforce markup formatter              |
| Aura markup    | `.cmp`, `.app`, `.evt`, `.design`, `.auradoc`          | Salesforce markup formatter              |
| LWC HTML       | `lwc/**/*.html`                                        | Salesforce LWC template formatter        |
| LWC JS/TS/CSS  | `lwc/**/*.{js,ts,css}`                                 | Prettier core delegation                 |
| Metadata XML   | `*-meta.xml`, `objects/**/*.xml`, other Salesforce XML | Metadata XML formatter                   |

The default route must stay in process. Worker or binary fallback paths require
an explicit option or an automatic fallback after in-process parser load failure.
```

- [ ] **Step 6: Run route tests**

Run:

```sh
pnpm --filter prettier-plugin-salesforce test src/routing.test.ts
```

Expected:

```text
PASS src/routing.test.ts
```

- [ ] **Step 7: Commit**

```sh
git add packages/prettier-plugin-salesforce/src docs/file-routing.md
git commit -m "feat: route salesforce source files"
```

## Task 4: Spike The Apex Parser Path

**Files:**

- Create: `packages/apex-parser-wasm/package.json`
- Create: `packages/apex-parser-wasm/src/index.ts`
- Create: `packages/prettier-plugin-salesforce/src/apex/ast.ts`
- Create: `packages/prettier-plugin-salesforce/src/apex/parser.ts`
- Create: `packages/prettier-plugin-salesforce/src/apex/parser.test.ts`
- Create: `docs/architecture.md`

- [ ] **Step 1: Define the parser contract**

Create `packages/prettier-plugin-salesforce/src/apex/ast.ts`:

```ts
export type ApexPosition = {
  line: number;
  column: number;
  offset: number;
};

export type ApexRange = {
  start: ApexPosition;
  end: ApexPosition;
};

export type ApexComment = {
  kind: "line" | "block";
  text: string;
  range: ApexRange;
};

export type ApexNode = {
  kind: string;
  text?: string;
  range: ApexRange;
  children: ApexNode[];
};

export type ApexDocument = {
  kind: "apex-document";
  mode: "class-or-trigger" | "anonymous";
  source: string;
  root: ApexNode;
  comments: ApexComment[];
  diagnostics: ApexDiagnostic[];
};

export type ApexDiagnostic = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  range?: ApexRange;
};
```

- [ ] **Step 2: Add a parser facade with a hard failure**

Create `packages/prettier-plugin-salesforce/src/apex/parser.ts`:

```ts
import type { Parser } from "prettier";
import type { ApexDocument } from "./ast.js";

export type ApexParserOptions = {
  anonymous?: boolean;
};

export function parseApex(
  source: string,
  options: ApexParserOptions = {},
): ApexDocument {
  throw new Error(
    `Apex parser not wired. anonymous=${options.anonymous === true ? "true" : "false"} bytes=${source.length}`,
  );
}

export const apexParser: Parser<ApexDocument> = {
  astFormat: "salesforce-apex-cst",
  parse: (source) => parseApex(source, { anonymous: false }),
  locStart: (node) => node.root.range.start.offset,
  locEnd: (node) => node.root.range.end.offset,
};

export const anonymousApexParser: Parser<ApexDocument> = {
  astFormat: "salesforce-apex-cst",
  parse: (source) => parseApex(source, { anonymous: true }),
  locStart: (node) => node.root.range.start.offset,
  locEnd: (node) => node.root.range.end.offset,
};
```

- [ ] **Step 3: Add failing parser test**

Create `packages/prettier-plugin-salesforce/src/apex/parser.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseApex } from "./parser.js";

describe("parseApex", () => {
  it("parses a minimal class into a document", () => {
    const doc = parseApex("public class Hello {}\n");
    expect(doc.kind).toBe("apex-document");
    expect(doc.root.kind).toBe("source_file");
    expect(doc.diagnostics).toEqual([]);
  });
});
```

Run:

```sh
pnpm --filter prettier-plugin-salesforce test src/apex/parser.test.ts
```

Expected:

```text
FAIL src/apex/parser.test.ts
Apex parser not wired
```

- [ ] **Step 4: Spike WASM parser package**

Create `packages/apex-parser-wasm/package.json`:

```json
{
  "name": "@prettier-salesforce/apex-parser-wasm",
  "version": "0.0.0",
  "type": "module",
  "exports": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "wasm"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "lint": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "web-tree-sitter": "^0.25.0"
  },
  "devDependencies": {
    "typescript": "^6.0.0",
    "vitest": "^4.1.0"
  }
}
```

Create `packages/apex-parser-wasm/src/index.ts`:

```ts
export type WasmApexNode = {
  kind: string;
  text?: string;
  startOffset: number;
  endOffset: number;
  children: WasmApexNode[];
};

export type WasmApexParseResult = {
  root: WasmApexNode;
  errors: WasmApexNode[];
};

export async function parseApexWithWasm(
  source: string,
): Promise<WasmApexParseResult> {
  throw new Error(
    `tree-sitter Apex WASM bundle is not built yet. bytes=${source.length}`,
  );
}
```

- [ ] **Step 5: Record architecture decision**

Create `docs/architecture.md`:

```md
# Architecture

The default formatter path must run inside Node.

## Apex Parser Decision

Start with a tree-sitter WASM parser package. It ships through npm and avoids
native install trouble. If warm format latency misses the budget, add a native
Node addon. Keep a persistent worker as fallback only.

## Why Not Jorje

The old formatter asks `jorje` for an AST through a Java/native serializer. That
keeps platform parse fidelity, but it costs process startup, server setup, and
large AST repair work. A normal Prettier formatter should not need a side
process for save-on-format.

## Why Primary corpus Parser Material

`apex-tree-sitter-parser` already carries a tree-sitter Apex grammar and has local
evidence around fast parsing. The formatter still needs a broader CST contract:
all tokens, comments, syntax errors, and stable ranges.
```

- [ ] **Step 6: Commit**

```sh
git add packages/apex-parser-wasm packages/prettier-plugin-salesforce/src/apex docs/architecture.md
git commit -m "feat: define apex parser architecture"
```

## Task 5: Build The Apex CST Printer In Thin Slices

**Files:**

- Modify: `packages/prettier-plugin-salesforce/src/index.ts`
- Modify: `packages/prettier-plugin-salesforce/src/apex/parser.ts`
- Create: `packages/prettier-plugin-salesforce/src/apex/printer.ts`
- Create: `packages/prettier-plugin-salesforce/src/apex/comments.ts`
- Create: Apex fixtures under `packages/prettier-plugin-salesforce/tests/apex/**`

- [ ] **Step 1: Wire Apex parser and printer**

Modify `packages/prettier-plugin-salesforce/src/index.ts` after the parser facade exists:

```ts
import type { Plugin } from "prettier";
import { anonymousApexParser, apexParser } from "./apex/parser.js";
import { apexPrinter } from "./apex/printer.js";
import { languages } from "./languages.js";
import { createParser } from "./parsers/router.js";
import { routerPrinter } from "./printers/router.js";

export const plugin: Plugin = {
  languages,
  parsers: {
    "salesforce-apex": apexParser,
    "salesforce-apex-anonymous": anonymousApexParser,
    "salesforce-markup": createParser("markup"),
    "salesforce-metadata-xml": createParser("metadata-xml"),
  },
  printers: {
    "salesforce-apex-cst": apexPrinter,
    "salesforce-router": routerPrinter,
  },
};

export default plugin;
```

- [ ] **Step 2: Add first Apex printer**

Create `packages/prettier-plugin-salesforce/src/apex/printer.ts`:

```ts
import type { AstPath, Doc, Printer } from "prettier";
import { builders } from "prettier/doc";
import type { ApexDocument, ApexNode } from "./ast.js";

const { hardline, join } = builders;

export const apexPrinter: Printer<ApexDocument | ApexNode> = {
  print(path: AstPath<ApexDocument | ApexNode>): Doc {
    const node = path.node;
    if (node.kind === "apex-document") {
      return [printNode(node.root), hardline];
    }
    return printNode(node);
  },
};

function printNode(node: ApexNode): Doc {
  if (node.kind === "source_file") {
    return join(hardline, node.children.map(printNode));
  }
  if (node.text !== undefined) {
    return node.text;
  }
  return join(" ", node.children.map(printNode));
}
```

- [ ] **Step 3: Add fixtures in this order**

For each fixture below, write the `.cls`, write `jsfmt.spec.ts`, confirm failure, implement the smallest printer rule, run the fixture, then commit.

1. `tests/apex/class-empty/Empty.cls`
2. `tests/apex/class-method/Method.cls`
3. `tests/apex/properties/Property.cls`
4. `tests/apex/comments/Comments.cls`
5. `tests/apex/soql/Query.cls`
6. `tests/apex/sosl/Search.cls`
7. `tests/apex/dml/Dml.cls`
8. `tests/apex/switch/Switch.cls`
9. `tests/apex/trigger/WidgetTrigger.trigger`
10. `tests/apex/fluent-chain/Fluent.cls`

Use this `jsfmt.spec.ts` pattern:

```ts
import "../../run-spec.js";

runSpec(import.meta.dirname, ["salesforce-apex"]);
```

- [ ] **Step 4: Add comment handling**

Create `packages/prettier-plugin-salesforce/src/apex/comments.ts`:

```ts
import type { ApexComment } from "./ast.js";

export function isPrettierIgnore(comment: ApexComment): boolean {
  return comment.text.includes("prettier-ignore");
}

export function isOwnLineComment(
  source: string,
  comment: ApexComment,
): boolean {
  const before = source.slice(0, comment.range.start.offset);
  const lineStart = before.lastIndexOf("\n") + 1;
  return source.slice(lineStart, comment.range.start.offset).trim() === "";
}
```

- [ ] **Step 5: Run Apex gates**

Run:

```sh
pnpm --filter prettier-plugin-salesforce test tests/apex
pnpm --filter @prettier-salesforce/benchmarks bench ./corpus
```

Expected:

```text
PASS tests/apex
```

Benchmark expected at this stage:

```text
salesforce-apex
```

with warm single-file Apex under the budget for at least the small fixtures.

- [ ] **Step 6: Commit each thin slice**

Use messages like:

```sh
git commit -m "feat: print apex empty classes"
git commit -m "feat: print apex methods"
git commit -m "feat: preserve apex comments"
```

## Task 6: Add Metadata XML Formatting

**Files:**

- Create: `packages/prettier-plugin-salesforce/src/xml/parser.ts`
- Create: `packages/prettier-plugin-salesforce/src/xml/printer.ts`
- Modify: `packages/prettier-plugin-salesforce/src/index.ts`
- Create: metadata XML fixtures under `packages/prettier-plugin-salesforce/tests/metadata/**`

- [ ] **Step 1: Add XML fixture**

Create `packages/prettier-plugin-salesforce/tests/metadata/basic/Widget__c.object-meta.xml`:

```xml
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata"><label>Widget</label><pluralLabel>Widgets</pluralLabel><nameField><label>Widget Name</label><type>Text</type></nameField><deploymentStatus>Deployed</deploymentStatus><sharingModel>ReadWrite</sharingModel></CustomObject>
```

Create `packages/prettier-plugin-salesforce/tests/metadata/basic/jsfmt.spec.ts`:

```ts
import "../../run-spec.js";

runSpec(import.meta.dirname, ["salesforce-metadata-xml"]);
```

- [ ] **Step 2: Confirm failure**

Run:

```sh
pnpm --filter prettier-plugin-salesforce test tests/metadata/basic
```

Expected:

```text
FAIL
```

because the metadata parser/printer is not wired.

- [ ] **Step 3: Add conservative XML parser**

Create `packages/prettier-plugin-salesforce/src/xml/parser.ts`:

```ts
import type { Parser } from "prettier";

export type MetadataXmlDocument = {
  kind: "metadata-xml";
  source: string;
};

export const metadataXmlParser: Parser<MetadataXmlDocument> = {
  astFormat: "salesforce-metadata-xml",
  parse: (source) => ({ kind: "metadata-xml", source }),
  locStart: () => 0,
  locEnd: (node) => node.source.length,
};
```

Create `packages/prettier-plugin-salesforce/src/xml/printer.ts`:

```ts
import type { Printer } from "prettier";
import type { MetadataXmlDocument } from "./parser.js";

export const metadataXmlPrinter: Printer<MetadataXmlDocument> = {
  print(path) {
    return formatXmlConservative(path.node.source);
  },
};

function formatXmlConservative(source: string): string {
  return source.trim().replace(/></g, ">\n<") + "\n";
}
```

This first printer is rough on purpose. It gives the harness a live path. Replace it with a real XML CST printer before release.

- [ ] **Step 4: Wire XML parser**

Modify `packages/prettier-plugin-salesforce/src/index.ts`:

```ts
import { metadataXmlParser } from "./xml/parser.js";
import { metadataXmlPrinter } from "./xml/printer.js";
```

Set:

```ts
"salesforce-metadata-xml": metadataXmlParser
```

and:

```ts
"salesforce-metadata-xml": metadataXmlPrinter
```

- [ ] **Step 5: Add metadata fixture families**

Add fixtures from `primaryCorpus/testdata/local-tests` in this order:

1. object metadata: `objects/Widget__c/Widget__c.object-meta.xml`
2. flow metadata: `flows/Widget_Status.flow-meta.xml`
3. profile metadata: `profiles/Admin.profile-meta.xml`
4. permissionset metadata: `permissionsets/App.permissionset-meta.xml`
5. layout metadata: `layouts/Widget__c-Widget Layout.layout-meta.xml`
6. labels metadata: `labels/CustomLabels.labels`
7. translation metadata: `translations/fr.translation-meta.xml`

- [ ] **Step 6: Set XML safety rules**

Add tests that assert:

```ts
expect(formatTwice(source)).toEqual(formatOnce(source));
expect(extractElementOrder(formatOnce(source))).toEqual(
  extractElementOrder(source),
);
```

No element sorting in v1. No attribute sorting unless Salesforce metadata docs and fixtures prove it safe.

- [ ] **Step 7: Commit**

```sh
git add packages/prettier-plugin-salesforce/src/xml packages/prettier-plugin-salesforce/tests/metadata
git commit -m "feat: add conservative salesforce metadata xml formatter"
```

## Task 7: Add Salesforce Markup Formatting

**Files:**

- Create: `packages/prettier-plugin-salesforce/src/markup/parser.ts`
- Create: `packages/prettier-plugin-salesforce/src/markup/printer.ts`
- Modify: `packages/prettier-plugin-salesforce/src/index.ts`
- Create: markup fixtures under `packages/prettier-plugin-salesforce/tests/markup/**`

- [ ] **Step 1: Add first Visualforce fixture**

Create `packages/prettier-plugin-salesforce/tests/markup/basic/AccountView.page`:

```xml
<apex:page standardController="Account"><apex:form><apex:pageBlock title="Account"><apex:outputField value="{!Account.Name}"/></apex:pageBlock></apex:form></apex:page>
```

Create `packages/prettier-plugin-salesforce/tests/markup/basic/jsfmt.spec.ts`:

```ts
import "../../run-spec.js";

runSpec(import.meta.dirname, ["salesforce-markup"]);
```

- [ ] **Step 2: Add markup parser and printer stubs**

Create `packages/prettier-plugin-salesforce/src/markup/parser.ts`:

```ts
import type { Parser } from "prettier";

export type SalesforceMarkupDocument = {
  kind: "salesforce-markup";
  source: string;
};

export const salesforceMarkupParser: Parser<SalesforceMarkupDocument> = {
  astFormat: "salesforce-markup",
  parse: (source) => ({ kind: "salesforce-markup", source }),
  locStart: () => 0,
  locEnd: (node) => node.source.length,
};
```

Create `packages/prettier-plugin-salesforce/src/markup/printer.ts`:

```ts
import type { Printer } from "prettier";
import type { SalesforceMarkupDocument } from "./parser.js";

export const salesforceMarkupPrinter: Printer<SalesforceMarkupDocument> = {
  print(path) {
    return path.node.source.trim().replace(/></g, ">\n<") + "\n";
  },
};
```

- [ ] **Step 3: Replace stubs with Salesforce-aware rules**

The real markup printer must handle:

- Visualforce expression values like `{!Account.Name}` without changing the expression.
- `apex:` tag names without namespace loss.
- Aura expressions like `{!v.recordId}` and `{#v.items}` without escaping changes.
- LWC directives like `for:each`, `if:true`, `lwc:if`, and event handlers.
- Embedded JavaScript and CSS only when the containing format has a stable parser.

- [ ] **Step 4: Add fixture families**

Add fixtures in this order:

1. Visualforce page
2. Visualforce component
3. Aura `.cmp`
4. Aura controller `.js` through Prettier core route
5. LWC `.html`
6. LWC `.js` through Prettier core route
7. LWC `.css` through Prettier core route

- [ ] **Step 5: Run markup gates**

Run:

```sh
pnpm --filter prettier-plugin-salesforce test tests/markup
pnpm --filter prettier-plugin-salesforce test tests/metadata
```

Expected:

```text
PASS tests/markup
PASS tests/metadata
```

- [ ] **Step 6: Commit**

```sh
git add packages/prettier-plugin-salesforce/src/markup packages/prettier-plugin-salesforce/tests/markup
git commit -m "feat: add salesforce markup formatter"
```

## Task 8: Add Corpus Gates From Primary corpus

**Files:**

- Create: `packages/prettier-plugin-salesforce/tests/corpus/primaryCorpus-corpus.test.ts`
- Modify: `packages/benchmarks/src/collect-corpus.ts`
- Modify: `docs/performance-budget.md`

- [ ] **Step 1: Write corpus test**

Create `packages/prettier-plugin-salesforce/tests/corpus/primaryCorpus-corpus.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import path from "node:path";
import prettier from "prettier";
import { describe, expect, it } from "vitest";
import plugin from "../../src/index.js";

const corpusRoot = "./corpus";
const sampleFiles = [
  "visualforce-pages/force-app/main/default/classes/VisualforcePagesTest.cls",
  "visualforce-pages/force-app/main/default/pages/OrderList.page",
  "ui-controller-discovery/force-app/main/default/aura/Widget/Widget.cmp",
  "ui-controller-discovery/force-app/main/default/lwc/widget/widget.js",
  "org-like-runner/force-app/main/default/objects/Widget__c/Widget__c.object-meta.xml",
  "flow/force-app/main/default/flows/Widget_Status.flow-meta.xml",
];

describe("primaryCorpus corpus smoke", () => {
  for (const relativePath of sampleFiles) {
    it(`formats ${relativePath} twice`, async () => {
      const filePath = path.join(corpusRoot, relativePath);
      const source = await readFile(filePath, "utf8");
      const once = await prettier.format(source, {
        filepath: filePath,
        plugins: [plugin],
      });
      const twice = await prettier.format(once, {
        filepath: filePath,
        plugins: [plugin],
      });
      expect(twice).toEqual(once);
    });
  }
});
```

- [ ] **Step 2: Run corpus smoke**

Run:

```sh
pnpm --filter prettier-plugin-salesforce test tests/corpus/primaryCorpus-corpus.test.ts
```

Expected:

```text
PASS tests/corpus/primaryCorpus-corpus.test.ts
```

- [ ] **Step 3: Add full corpus benchmark mode**

Modify `packages/benchmarks/src/run-format-benchmark.ts` to accept `--plugin`:

```ts
const usePlugin = process.argv.includes("--plugin");
```

When `usePlugin` is true, import `prettier-plugin-salesforce` and pass it in `plugins`.

- [ ] **Step 4: Update performance doc**

Append to `docs/performance-budget.md`:

````md
## Corpus Gate

Run:

```sh
pnpm bench ./corpus --plugin
```
````

Release candidates must record warm run results here before publishing.

````

- [ ] **Step 5: Commit**

```sh
git add packages/prettier-plugin-salesforce/tests/corpus packages/benchmarks docs/performance-budget.md
git commit -m "test: add primaryCorpus corpus formatter gate"
````

## Task 9: Packaging And Fallback Path

**Files:**

- Create: `packages/apex-parser-worker/go.mod`
- Create: `packages/apex-parser-worker/cmd/apex-parser-worker/main.go`
- Create: `packages/prettier-plugin-salesforce/src/apex/fallback-worker.ts`
- Modify: `packages/prettier-plugin-salesforce/src/apex/parser.ts`
- Create: `docs/native-fallback.md`

- [ ] **Step 1: Only add fallback if WASM misses target or cannot load**

Do not build this task by default. First prove one of these:

- WASM warm Apex format exceeds 50 ms on ordinary files.
- WASM parser cannot support required tree-sitter query features.
- Node packaging makes WASM load brittle in common editors.

- [ ] **Step 2: Define worker protocol**

Create `docs/native-fallback.md`:

````md
# Native Fallback

The fallback worker is a persistent process. It is not the default path.

## Protocol

Input line:

```json
{
  "id": "1",
  "mode": "class-or-trigger",
  "path": "Hello.cls",
  "source": "public class Hello {}"
}
```
````

Output line:

```json
{ "id": "1", "ok": true, "document": { "kind": "apex-document" } }
```

Error line:

```json
{
  "id": "1",
  "ok": false,
  "diagnostics": [
    { "severity": "error", "code": "APEXPARSE001", "message": "parse failed" }
  ]
}
```

````

- [ ] **Step 3: Add TypeScript worker client**

Create `packages/prettier-plugin-salesforce/src/apex/fallback-worker.ts`:

```ts
export type WorkerRequest = {
  id: string;
  mode: "class-or-trigger" | "anonymous";
  path: string;
  source: string;
};

export type WorkerResponse = {
  id: string;
  ok: boolean;
  document?: unknown;
  diagnostics?: unknown[];
};

export async function parseWithFallbackWorker(_request: WorkerRequest): Promise<WorkerResponse> {
  throw new Error("fallback worker is not implemented");
}
````

- [ ] **Step 4: Commit**

```sh
git add docs/native-fallback.md packages/prettier-plugin-salesforce/src/apex/fallback-worker.ts
git commit -m "docs: define apex parser fallback protocol"
```

## Task 10: Release Gate

**Files:**

- Create: `docs/release-gate.md`
- Modify: `package.json`
- Modify: `packages/prettier-plugin-salesforce/package.json`

- [ ] **Step 1: Add release gate doc**

Create `docs/release-gate.md`:

````md
# Release Gate

Run these commands before publishing:

```sh
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm bench ./corpus --plugin
```
````

## Required Evidence

- warm Apex single-file time under 50 ms
- save-on-format path under 100 ms on sample Apex, LWC HTML, Visualforce, and metadata XML
- corpus smoke passes
- full benchmark report attached to release notes
- no Java or HTTP server in default path
- format-twice idempotence passes

````

- [ ] **Step 2: Add package scripts**

Modify root `package.json`:

```json
{
  "scripts": {
    "release:check": "pnpm build && pnpm test && pnpm lint && pnpm bench ./corpus --plugin"
  }
}
````

- [ ] **Step 3: Run release gate**

Run:

```sh
pnpm release:check
```

Expected:

```text
PASS
```

and benchmark output under the target budget.

- [ ] **Step 4: Commit**

```sh
git add docs/release-gate.md package.json packages/prettier-plugin-salesforce/package.json
git commit -m "chore: add release gate"
```

## Risks

- Tree-sitter grammar may parse fast but lack formatter-grade CST coverage for Apex edge cases. Mitigation: fixture every construct before claiming support.
- WASM may not hit the save-on-format budget. Mitigation: native addon spike before worker fallback.
- XML format may change deploy semantics if it reorders nodes. Mitigation: no semantic reordering in v1.
- Visualforce, Aura, and LWC markup look similar but have different expression rules. Mitigation: separate fixture families and parser modes.
- Prettier core delegation may not work inside a plugin without careful `textToDoc` use. Mitigation: test LWC JS/TS/CSS routing with real Prettier calls early.

## Completion Definition

- `prettier-plugin-salesforce` installs as one package.
- `prettier --write force-app --plugin prettier-plugin-salesforce` formats Apex, Visualforce, Aura, LWC, and metadata XML files.
- Apex default parse path runs in process.
- No Java server starts in the default path.
- Format-twice tests pass for all fixture families.
- Primary corpus corpus smoke passes.
- Benchmark report shows the warm Apex target is met.
- Docs state supported files, unsupported edges, and performance budget.
