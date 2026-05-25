import { describe, expect, it } from "vitest";
import { languages } from "./languages.js";

const ALLOWED_DUPLICATE_EXTENSIONS = new Set([".app", ".md", ".xml"]);

describe("language surface contract", () => {
  it("keeps duplicated plugin extension registrations explicit and intentional", () => {
    const byExtension = new Map<string, Set<string>>();

    for (const language of languages) {
      const seenInLanguage = new Set<string>();
      for (const extension of language.extensions ?? []) {
        const normalized = extension.toLowerCase();
        if (seenInLanguage.has(normalized)) {
          continue;
        }
        seenInLanguage.add(normalized);
        const owners = byExtension.get(normalized) ?? new Set<string>();
        owners.add(language.name);
        byExtension.set(normalized, owners);
      }
    }

    const duplicates = [...byExtension.entries()]
      .filter(([, owners]) => owners.size > 1)
      .sort((a, b) => a[0].localeCompare(b[0]));

    const unexpected = duplicates
      .filter(([extension]) => !ALLOWED_DUPLICATE_EXTENSIONS.has(extension))
      .map(([extension, owners]) => `${extension}\t${[...owners].sort((a, b) => a.localeCompare(b)).join(", ")}`);

    expect(unexpected, `Unexpected duplicate extension registrations:\n${unexpected.join("\n")}`).toEqual([]);
  });

  it("keeps duplicated extension registrations routed through the path-aware parser", () => {
    const duplicatedExtensions = collectDuplicatedExtensions();
    const violations: string[] = [];

    for (const extension of duplicatedExtensions) {
      const parserOwners = languages
        .filter((language) => (language.extensions ?? []).some((candidate) => candidate.toLowerCase() === extension))
        .map((language) => ({ name: language.name, parsers: language.parsers ?? [] }));

      const hasPathAwareOwner = parserOwners.some((owner) => owner.parsers.includes("salesforce-router-by-path"));
      if (!hasPathAwareOwner) {
        violations.push(`${extension}\t${parserOwners.map((owner) => owner.name).join(", ")}`);
      }
    }

    expect(violations, `Duplicated extensions without path-aware parser owner:\n${violations.join("\n")}`).toEqual([]);
  });
});

function collectDuplicatedExtensions(): string[] {
  const ownersByExtension = new Map<string, Set<string>>();
  for (const language of languages) {
    const seenInLanguage = new Set<string>();
    for (const extension of language.extensions ?? []) {
      const normalized = extension.toLowerCase();
      if (seenInLanguage.has(normalized)) {
        continue;
      }
      seenInLanguage.add(normalized);
      const owners = ownersByExtension.get(normalized) ?? new Set<string>();
      owners.add(language.name);
      ownersByExtension.set(normalized, owners);
    }
  }
  return [...ownersByExtension.entries()]
    .filter(([, owners]) => owners.size > 1)
    .map(([extension]) => extension);
}
