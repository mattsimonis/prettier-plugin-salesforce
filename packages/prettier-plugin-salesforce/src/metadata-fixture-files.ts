import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

export const METADATA_FIXTURE_ROOT = join(__dirname, "..", "tests", "metadata");
const SPEC_FILE_NAME = "jsfmt.spec.ts";

export type MetadataFixtureFile = {
  absolutePath: string;
  relativePath: string;
};

export function collectMetadataFixtureFilesSync(rootPath: string = METADATA_FIXTURE_ROOT): MetadataFixtureFile[] {
  const files: MetadataFixtureFile[] = [];

  function walk(currentPath: string): void {
    const entries = readdirSync(currentPath, { withFileTypes: true })
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const entryPath = join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }
      if (!entry.isFile() || entry.name === SPEC_FILE_NAME) {
        continue;
      }
      files.push({
        absolutePath: entryPath,
        relativePath: relative(rootPath, entryPath).replaceAll("\\", "/")
      });
    }
  }

  walk(rootPath);
  return files;
}

export function collectMetadataFixturePathsSync(rootPath: string = METADATA_FIXTURE_ROOT): string[] {
  return collectMetadataFixtureFilesSync(rootPath).map((entry) => entry.absolutePath);
}

export function collectMetadataFixtureDirectoriesSync(rootPath: string = METADATA_FIXTURE_ROOT): Set<string> {
  return new Set(
    readdirSync(rootPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name.toLowerCase())
  );
}
