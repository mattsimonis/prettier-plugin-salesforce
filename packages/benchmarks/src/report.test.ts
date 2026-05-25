import { describe, expect, it } from "vitest";
import { assertBenchmarkResults, type BenchmarkResult } from "./report.js";

describe("benchmark release assertions", () => {
  it("fails when any formatted file failed", () => {
    const result = benchmarkResult({ failedCount: 1 });
    result.familyStats.apex.failedCount = 1;

    expect(() => assertBenchmarkResults([result])).toThrow(/failed files/i);
  });

  it("fails when average wall time exceeds the release budget", () => {
    const result = benchmarkResult({ fileCount: 2, formattedCount: 2, wallMs: 250 });

    expect(() => assertBenchmarkResults([result], { maxMsPerFile: 100 })).toThrow(/ms per file/i);
  });
});

function benchmarkResult(overrides: Partial<BenchmarkResult> = {}): BenchmarkResult {
  return {
    label: "prettier-plugin-salesforce",
    fileCount: 4,
    formattedCount: 4,
    failedCount: 0,
    inputBytes: 400,
    outputBytes: 420,
    wallMs: 80,
    cpuUserMs: 50,
    cpuSystemMs: 10,
    rssBytes: 100_000,
    familyStats: {
      apex: familyStat({ fileCount: 1, formattedCount: 1 }),
      markup: familyStat({ fileCount: 1, formattedCount: 1 }),
      xml: familyStat({ fileCount: 1, formattedCount: 1 }),
      other: familyStat({ fileCount: 1, formattedCount: 1 })
    },
    ...overrides
  };
}

function familyStat(overrides = {}) {
  return {
    fileCount: 0,
    formattedCount: 0,
    failedCount: 0,
    inputBytes: 100,
    outputBytes: 100,
    ...overrides
  };
}
