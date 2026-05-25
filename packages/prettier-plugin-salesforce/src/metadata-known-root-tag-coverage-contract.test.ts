import { describe, expect, it } from "vitest";
import { METADATA_XML_FAMILY_DIRECTORIES } from "./metadata-families.js";
import { metadataCanonicalFamilyFromMetadataSource } from "./metadata-family-routing.js";
import { KNOWN_SALESFORCE_METADATA_ROOT_TAGS } from "./xml/salesforce-metadata-root-tags.js";

describe("metadata known root tag coverage contract", () => {
  it("maps every known Salesforce metadata root tag to a declared canonical family", () => {
    const declaredFamilies = new Set(METADATA_XML_FAMILY_DIRECTORIES);
    const missing: string[] = [];
    const unknownFamilies: string[] = [];

    for (const rootTag of KNOWN_SALESFORCE_METADATA_ROOT_TAGS) {
      const family = metadataCanonicalFamilyFromMetadataSource(`<${rootTag}/>`);
      if (!family) {
        missing.push(rootTag);
        continue;
      }
      if (!declaredFamilies.has(family)) {
        unknownFamilies.push(`${rootTag}\t${family}`);
      }
    }

    expect(missing).toEqual([]);
    expect(unknownFamilies).toEqual([]);
  });
});
