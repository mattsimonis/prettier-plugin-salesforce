import type { FileFamily } from "./collect-corpus.js";

export type FamilyStats = Record<FileFamily, FamilyStat>;
const REQUIRED_FAMILIES: readonly FileFamily[] = ["apex", "markup", "xml", "other"];

export type FamilyStat = {
  fileCount: number;
  formattedCount: number;
  failedCount: number;
  inputBytes: number;
  outputBytes: number;
};

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
  familyStats: FamilyStats;
};

export type BenchmarkAssertOptions = {
  maxMsPerFile?: number;
  requiredFamilies?: readonly FileFamily[];
  requireZeroFailures?: boolean;
  requireNonEmptyFamilies?: boolean;
};

export function printReport(results: BenchmarkResult[]): void {
  assertBenchmarkResults(results);

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
    output_kb: round(result.outputBytes / 1024)
  }));

  console.table(rows);

  const familyRows = results.flatMap((result) =>
    (Object.entries(result.familyStats) as Array<[FileFamily, FamilyStat]>).map(([family, stats]) => ({
      label: result.label,
      family,
      files: stats.fileCount,
      formatted: stats.formattedCount,
      failed: stats.failedCount,
      fail_pct: pct(stats.failedCount, stats.fileCount),
      input_kb: round(stats.inputBytes / 1024),
      output_kb: round(stats.outputBytes / 1024)
    }))
  );

  console.table(familyRows);
}

export function assertBenchmarkResults(results: BenchmarkResult[], options: BenchmarkAssertOptions = {}): void {
  const requiredFamilies = options.requiredFamilies ?? REQUIRED_FAMILIES;
  const requireZeroFailures = options.requireZeroFailures ?? true;
  for (const result of results) {
    assertNonNegative(result.fileCount, `${result.label}.fileCount`);
    assertNonNegative(result.formattedCount, `${result.label}.formattedCount`);
    assertNonNegative(result.failedCount, `${result.label}.failedCount`);
    assertNonNegative(result.inputBytes, `${result.label}.inputBytes`);
    assertNonNegative(result.outputBytes, `${result.label}.outputBytes`);
    if (requireZeroFailures && result.failedCount > 0) {
      throw new Error(`Benchmark ${result.label} has ${result.failedCount} failed files`);
    }
    if (requireZeroFailures && result.formattedCount !== result.fileCount) {
      throw new Error(`Benchmark ${result.label} formatted ${result.formattedCount} of ${result.fileCount} files`);
    }
    if (options.maxMsPerFile !== undefined) {
      const msPerFile = result.wallMs / Math.max(result.fileCount, 1);
      if (msPerFile > options.maxMsPerFile) {
        throw new Error(
          `Benchmark ${result.label} took ${round(msPerFile)} ms per file, above ${options.maxMsPerFile} ms per file`
        );
      }
    }

    const presentFamilies = Object.keys(result.familyStats) as FileFamily[];
    for (const family of requiredFamilies) {
      if (!presentFamilies.includes(family)) {
        throw new Error(`Missing benchmark family "${family}" for ${result.label}`);
      }
      const stats = result.familyStats[family];
      if (options.requireNonEmptyFamilies === true && stats.fileCount === 0) {
        throw new Error(`Benchmark family "${family}" for ${result.label} has no files`);
      }
      assertNonNegative(stats.fileCount, `${result.label}.${family}.fileCount`);
      assertNonNegative(stats.formattedCount, `${result.label}.${family}.formattedCount`);
      assertNonNegative(stats.failedCount, `${result.label}.${family}.failedCount`);
      assertNonNegative(stats.inputBytes, `${result.label}.${family}.inputBytes`);
      assertNonNegative(stats.outputBytes, `${result.label}.${family}.outputBytes`);
      if (requireZeroFailures && stats.failedCount > 0) {
        throw new Error(`Benchmark family "${family}" for ${result.label} has ${stats.failedCount} failed files`);
      }
    }
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function assertNonNegative(value: number, field: string): void {
  if (value < 0) {
    throw new Error(`Expected non-negative benchmark metric for ${field}, got ${value}`);
  }
}

function pct(part: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return round((part / total) * 100);
}
