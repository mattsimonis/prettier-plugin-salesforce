import { describe, expect, it } from "vitest";
import {
  applySortLabelsToggle,
  defaultPlaygroundConfig,
  normalizePlaygroundConfigOptions,
  omitRuntimeOptions,
  readBoundedInteger,
  readSortLabelsToggle
} from "./config-options.js";

describe("playground config options", () => {
  it("defaults every playground option shown in the config UI", () => {
    expect(defaultPlaygroundConfig).toEqual({
      printWidth: 100,
      tabWidth: 4,
      useTabs: false,
      singleQuote: false,
      bracketSameLine: false,
      trailingComma: "none",
      salesforceSortLabelsByFullName: false,
      salesforceFinalNewline: true,
      salesforceTestVisiblePlacement: "own-line",
      salesforceBlankLineBeforeLineComment: false,
      salesforceLogicalOperatorPosition: "end-of-line"
    });
  });

  it("lets the sort-labels checkbox turn sorting off when JSON was true", () => {
    const config = {
      printWidth: 100,
      salesforceSortLabelsByFullName: true
    };

    expect(applySortLabelsToggle(config, false)).toMatchObject({
      printWidth: 100,
      salesforceSortLabelsByFullName: false
    });
    expect(applySortLabelsToggle(config, false)).not.toHaveProperty("salesforceSortLabelEntriesByFullName");
  });

  it("turns off the deprecated label-sort alias when it exists", () => {
    const config = {
      salesforceSortLabelsByFullName: true,
      salesforceSortLabelEntriesByFullName: true
    };

    expect(applySortLabelsToggle(config, false)).toMatchObject({
      salesforceSortLabelsByFullName: false,
      salesforceSortLabelEntriesByFullName: false
    });
  });

  it("reads either current or deprecated label-sort option into the checkbox", () => {
    expect(readSortLabelsToggle({ salesforceSortLabelsByFullName: true })).toBe(true);
    expect(readSortLabelsToggle({ salesforceSortLabelEntriesByFullName: true })).toBe(true);
    expect(readSortLabelsToggle({ salesforceSortLabelsByFullName: false })).toBe(false);
  });

  it("keeps route/runtime options under playground control", () => {
    expect(
      omitRuntimeOptions({
        parser: "html",
        filepath: "wrong.html",
        plugins: [],
        printWidth: 100
      })
    ).toEqual({ printWidth: 100 });
  });

  it("clamps numeric controls to their displayed bounds", () => {
    expect(readBoundedInteger(999, 100, { min: 20, max: 240 })).toBe(240);
    expect(readBoundedInteger(0, 2, { min: 1, max: 12 })).toBe(1);
    expect(readBoundedInteger(4, 2, { min: 1, max: 12 })).toBe(4);
    expect(readBoundedInteger(2.5, 2, { min: 1, max: 12 })).toBe(2);
  });

  it("normalizes pasted JSON before formatting", () => {
    expect(
      normalizePlaygroundConfigOptions(
        {
          parser: "html",
          filepath: "wrong.html",
          printWidth: 999,
          tabWidth: 0,
          singleQuote: true
        },
        { printWidth: 100, tabWidth: 2 }
      )
    ).toEqual({
      printWidth: 240,
      tabWidth: 1,
      singleQuote: true
    });
  });

  it("falls back for non-numeric JSON values instead of coercing them", () => {
    expect(
      normalizePlaygroundConfigOptions(
        {
          printWidth: null,
          tabWidth: false
        },
        { printWidth: 100, tabWidth: 2 }
      )
    ).toEqual({
      printWidth: 100,
      tabWidth: 2
    });
  });

  it("normalizes boolean and choice options to known playground defaults", () => {
    expect(
      normalizePlaygroundConfigOptions(
        {
          useTabs: "yes",
          singleQuote: true,
          bracketSameLine: 1,
          trailingComma: "sideways",
          salesforceSortLabelsByFullName: "true",
          salesforceFinalNewline: false,
          salesforceTestVisiblePlacement: "beside",
          salesforceBlankLineBeforeLineComment: null,
          salesforceLogicalOperatorPosition: "start-of-line"
        },
        defaultPlaygroundConfig
      )
    ).toEqual({
      useTabs: false,
      singleQuote: true,
      bracketSameLine: false,
      trailingComma: "none",
      salesforceSortLabelsByFullName: false,
      salesforceFinalNewline: false,
      salesforceTestVisiblePlacement: "own-line",
      salesforceBlankLineBeforeLineComment: false,
      salesforceLogicalOperatorPosition: "start-of-line",
      printWidth: 100,
      tabWidth: 4
    });
  });
});
