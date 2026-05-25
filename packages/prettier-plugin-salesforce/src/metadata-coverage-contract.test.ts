import { describe, expect, it } from "vitest";
import { languages } from "./languages.js";
import { METADATA_XML_FAMILIES } from "./metadata-families.js";
import { routeFile } from "./routing.js";

function getMetadataLanguageExtensions(): Set<string> {
  const metadataLanguage = languages.find((language) => language.name === "Salesforce Metadata XML");
  expect(metadataLanguage).toBeDefined();
  return new Set((metadataLanguage?.extensions ?? []).map((extension) => extension.toLowerCase()));
}

describe("metadata routing/language coverage contract", () => {
  it("routes every family extension through metadata-xml in matching metadata directory paths", () => {
    const metadataExtensions = getMetadataLanguageExtensions();

    for (const family of METADATA_XML_FAMILIES) {
      for (const extension of [family.routingExtension, ...family.languageExtensions]) {
        const lower = extension.toLowerCase();
        expect(metadataExtensions.has(lower)).toBe(true);
        const filePath = `/tmp/force-app/main/default/${family.directory}/Sample.Component${lower}`;
        expect(routeFile(filePath)).toBe("metadata-xml");
      }
    }
  });

  it("keeps aura .app routed as markup, while applications .app routes metadata-xml", () => {
    expect(routeFile("/tmp/force-app/main/default/aura/Widget/Widget.app")).toBe("markup");
    expect(routeFile("/tmp/force-app/main/default/applications/Console.app")).toBe("metadata-xml");
  });
});
