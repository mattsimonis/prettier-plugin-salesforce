import { describe, expect, test } from "vitest";
import { METADATA_XML_FAMILIES } from "./metadata-families.js";
import { metadataCanonicalFamilyFromPath } from "./metadata-family-routing.js";
import { routeFile } from "./routing.js";

describe("metadata generated extension path contract", () => {
  test("declared metadata family extensions route as metadata-xml and map to canonical family", () => {
    const failures: string[] = [];

    for (const family of METADATA_XML_FAMILIES) {
      const directories = [family.directory, ...family.routingDirectoryAliases].filter((value, index, all) => all.indexOf(value) === index);
      const extensions = [family.routingExtension, ...family.languageExtensions].map((value) => value.toLowerCase());

      for (const directory of directories) {
        for (const extension of extensions) {
          if (isContextualAmbiguousExtension(extension)) {
            continue;
          }
          const filePath = `/tmp/${directory}/Sample${extension}`;
          const route = routeFile(filePath);
          if (route !== "metadata-xml") {
            failures.push(`${family.directory}\t${directory}\t${extension}\troute=${route}`);
            continue;
          }
          const canonical = metadataCanonicalFamilyFromPath(filePath.toLowerCase());
          if (canonical !== family.directory) {
            failures.push(`${family.directory}\t${directory}\t${extension}\tcanonical=${canonical ?? "null"}`);
          }
        }
      }
    }

    expect(failures, `Generated extension path failures:\n${failures.join("\n")}`).toEqual([]);
  });
});

function isContextualAmbiguousExtension(extension: string): boolean {
  return extension === ".js-meta.xml" || extension === ".app-meta.xml";
}
