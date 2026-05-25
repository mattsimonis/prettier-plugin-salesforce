import prettier from "prettier";
import { describe, expect, it } from "vitest";
import plugin from "./index.js";
import { metadataCanonicalFamilyFromMetadataSource } from "./metadata-family-routing.js";
import { KNOWN_SALESFORCE_METADATA_ROOT_TAGS } from "./xml/salesforce-metadata-root-tags.js";

describe("metadata known root-tag runtime contract", () => {
  it("formats a minimal metadata sample for every known Salesforce metadata root tag", async () => {
    const failures: string[] = [];

    for (const rootTag of KNOWN_SALESFORCE_METADATA_ROOT_TAGS) {
      const family = metadataCanonicalFamilyFromMetadataSource(`<${rootTag}/>`);
      if (!family) {
        failures.push(`${rootTag}\tno-family-mapping`);
        continue;
      }

      const source = `<${rootTag}><fullName>Sample</fullName></${rootTag}>`;
      try {
        const formatted = await prettier.format(source, {
          filepath: `/tmp/force-app/main/default/metadata/${rootTag}.xml`,
          plugins: [plugin]
        });
        if (formatted.trim().length === 0) {
          failures.push(`${rootTag}\tempty-output`);
        }
      } catch (error) {
        failures.push(`${rootTag}\t${String(error).split("\n")[0]}`);
      }
    }

    expect(failures).toEqual([]);
  });
});
