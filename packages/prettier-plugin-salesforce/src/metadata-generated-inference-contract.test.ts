import prettier from "prettier";
import { describe, expect, test } from "vitest";
import plugin from "./index.js";
import { METADATA_XML_FAMILIES } from "./metadata-families.js";
import { routeFile } from "./routing.js";

describe("metadata generated inference contract", () => {
  test("declared metadata family extensions infer salesforce metadata parser by path", async () => {
    const failures: string[] = [];

    for (const family of METADATA_XML_FAMILIES) {
      const directories = [family.directory, ...family.routingDirectoryAliases].filter((value, index, all) => all.indexOf(value) === index);
      const extensions = [family.routingExtension, ...family.languageExtensions].map((value) => value.toLowerCase());

      for (const directory of directories) {
        for (const extension of extensions) {
          if (isContextualAmbiguousExtension(extension)) {
            continue;
          }

          const familyPath = `/tmp/${directory}/Sample${extension}`;
          const route = routeFile(familyPath);
          if (route !== "metadata-xml") {
            failures.push(`${family.directory}\t${directory}\t${extension}\troute=${route}`);
            continue;
          }

          const info = await prettier.getFileInfo(familyPath, { plugins: [plugin] });
          const expectedParser = extension === ".app" || extension === ".md"
            ? "salesforce-router-by-path"
            : "salesforce-metadata-xml";
          if (info.inferredParser !== expectedParser) {
            failures.push(
              `${family.directory}\t${directory}\t${extension}\tinferred=${String(info.inferredParser)}`
            );
          }

          const metaSidecarPath = `/tmp/${directory}/Sample${toMetaXmlSuffix(extension)}`;
          const sidecarRoute = routeFile(metaSidecarPath);
          if (sidecarRoute !== "metadata-xml") {
            failures.push(`${family.directory}\t${directory}\t${extension}\tsidecarRoute=${sidecarRoute}`);
            continue;
          }

          const sidecarInfo = await prettier.getFileInfo(metaSidecarPath, { plugins: [plugin] });
          if (sidecarInfo.inferredParser !== "salesforce-metadata-xml") {
            failures.push(
              `${family.directory}\t${directory}\t${extension}\tsidecarInferred=${String(sidecarInfo.inferredParser)}`
            );
          }
        }
      }
    }

    expect(failures, `Generated metadata inference failures:\n${failures.join("\n")}`).toEqual([]);
  });
});

function isContextualAmbiguousExtension(extension: string): boolean {
  return extension === ".js-meta.xml" || extension === ".app-meta.xml" || extension === ".app";
}

function toMetaXmlSuffix(extension: string): string {
  if (extension.endsWith("-meta.xml")) {
    return extension;
  }
  if (extension.endsWith(".xml")) {
    return extension;
  }
  return `${extension}-meta.xml`;
}
