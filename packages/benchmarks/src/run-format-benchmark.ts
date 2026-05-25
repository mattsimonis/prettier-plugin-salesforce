import { readFile } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import prettier, { type Plugin } from "prettier";
import { collectCorpus, type CorpusFile } from "./collect-corpus.js";
import { assertBenchmarkResults, printReport, type BenchmarkResult, type FamilyStats } from "./report.js";

const usePlugin = process.argv.includes("--plugin");
const releaseMode = process.argv.includes("--release");
const maxMsPerFile = readNumberFlag("--max-ms-per-file", 100);
const maxWarmApexMs = readNumberFlag("--max-warm-apex-ms", 50);
const jsonOut = readStringFlag("--json-out");
const root = process.argv.slice(2).find((arg) => !arg.startsWith("--")) ?? "corpus";

async function main(): Promise<void> {
  const files = await collectCorpus(root);
  const plugins = usePlugin ? [(await import("prettier-plugin-salesforce")).default as Plugin] : [];
  const result = await runPrettier(files, plugins);
  const releaseSamples = releaseMode ? await runReleaseSamples(files, plugins) : [];
  assertBenchmarkResults([result], {
    maxMsPerFile: releaseMode ? maxMsPerFile : undefined,
    requireNonEmptyFamilies: releaseMode,
    requireZeroFailures: true
  });
  assertReleaseSamples(releaseSamples);
  printReport([result]);
  if (jsonOut !== null) {
    await writeFile(jsonOut, `${JSON.stringify({ result, releaseSamples }, null, 2)}\n`);
  }
}

async function runPrettier(files: CorpusFile[], plugins: Plugin[]): Promise<BenchmarkResult> {
  const startCpu = process.cpuUsage();
  const start = performance.now();
  let formattedCount = 0;
  let failedCount = 0;
  let inputBytes = 0;
  let outputBytes = 0;
  const familyStats = emptyFamilyStats();

  for (const file of files) {
    const filePath = file.path;
    const source = await readFile(filePath, "utf8");
    const stats = familyStats[file.family];
    inputBytes += Buffer.byteLength(source);
    stats.fileCount += 1;
    stats.inputBytes += Buffer.byteLength(source);
    try {
      const formatted = await prettier.format(source, { filepath: filePath, plugins });
      const formattedBytes = Buffer.byteLength(formatted);
      outputBytes += formattedBytes;
      formattedCount += 1;
      stats.formattedCount += 1;
      stats.outputBytes += formattedBytes;
    } catch {
      failedCount += 1;
      stats.failedCount += 1;
    }
  }

  const elapsed = performance.now() - start;
  const cpu = process.cpuUsage(startCpu);
  return {
    label: usePlugin ? "prettier-plugin-salesforce" : "prettier-core-baseline",
    fileCount: files.length,
    formattedCount,
    failedCount,
    inputBytes,
    outputBytes,
    wallMs: elapsed,
    cpuUserMs: cpu.user / 1000,
    cpuSystemMs: cpu.system / 1000,
    rssBytes: process.memoryUsage().rss,
    familyStats
  };
}

function emptyFamilyStats(): FamilyStats {
  return {
    apex: emptyFamilyStat(),
    markup: emptyFamilyStat(),
    xml: emptyFamilyStat(),
    other: emptyFamilyStat()
  };
}

function emptyFamilyStat() {
  return {
    fileCount: 0,
    formattedCount: 0,
    failedCount: 0,
    inputBytes: 0,
    outputBytes: 0
  };
}

await main();

type ReleaseSample = {
  label: string;
  filePath: string;
  wallMs: number;
  budgetMs: number;
};

async function runReleaseSamples(files: CorpusFile[], plugins: Plugin[]): Promise<ReleaseSample[]> {
  const samples: ReleaseSample[] = [];
  await addWarmApexSample(samples, files, plugins);
  for (const family of ["apex", "markup", "xml", "other"] as const) {
    const file = files.find((candidate) => candidate.family === family);
    if (!file) {
      throw new Error(`Missing release benchmark sample for ${family}`);
    }
    samples.push(await timeFormatSample(`${family} sample`, file, plugins, maxMsPerFile));
  }
  return samples;
}

async function addWarmApexSample(samples: ReleaseSample[], files: CorpusFile[], plugins: Plugin[]): Promise<void> {
  const apexFile = files.find((file) => file.family === "apex");
  if (!apexFile) {
    throw new Error("Missing release benchmark warm Apex sample");
  }
  await formatFile(apexFile, plugins);
  samples.push(await timeFormatSample("warm apex", apexFile, plugins, maxWarmApexMs));
}

async function timeFormatSample(label: string, file: CorpusFile, plugins: Plugin[], budgetMs: number): Promise<ReleaseSample> {
  const start = performance.now();
  await formatFile(file, plugins);
  return {
    label,
    filePath: file.path,
    wallMs: performance.now() - start,
    budgetMs
  };
}

async function formatFile(file: CorpusFile, plugins: Plugin[]): Promise<string> {
  const source = await readFile(file.path, "utf8");
  return prettier.format(source, { filepath: file.path, plugins });
}

function assertReleaseSamples(samples: ReleaseSample[]): void {
  for (const sample of samples) {
    if (sample.wallMs > sample.budgetMs) {
      throw new Error(
        `Release benchmark ${sample.label} took ${Math.round(sample.wallMs)} ms, above ${sample.budgetMs} ms: ${sample.filePath}`
      );
    }
  }
}

function readNumberFlag(name: string, fallback: number): number {
  const prefix = `${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Expected positive number for ${name}, got ${raw}`);
  }
  return parsed;
}

function readStringFlag(name: string): string | null {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}
