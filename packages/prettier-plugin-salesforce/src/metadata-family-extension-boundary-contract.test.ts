import { describe, expect, it } from "vitest";
import { METADATA_XML_FAMILIES } from "./metadata-families.js";
import { routeFile } from "./routing.js";
import { metadataXmlParser } from "./xml/parser.js";

const CROSS_FAMILY_PROBE_EXTENSIONS = [".md", ".app", ".flow", ".profile", ".permissionset", ".flowdefinition"];

describe("metadata family extension boundary contract", () => {
  it("does not route cross-family extension probes as metadata-xml", () => {
    for (const family of METADATA_XML_FAMILIES) {
      const allowed = new Set([family.routingExtension, ...family.languageExtensions].map((value) => value.toLowerCase()));
      for (const extension of CROSS_FAMILY_PROBE_EXTENSIONS) {
        if (allowed.has(extension)) {
          continue;
        }

        const filepath = `/tmp/force-app/main/default/${family.directory}/BoundaryProbe${extension}`;
        expect(routeFile(filepath)).not.toBe("metadata-xml");
      }
    }
  });

  it("does not enable metadata transforms for cross-family extension probes", () => {
    for (const family of METADATA_XML_FAMILIES) {
      const allowed = new Set([family.routingExtension, ...family.languageExtensions].map((value) => value.toLowerCase()));
      for (const extension of CROSS_FAMILY_PROBE_EXTENSIONS) {
        if (allowed.has(extension)) {
          continue;
        }

        const filepath = `/tmp/force-app/main/default/${family.directory}/BoundaryProbe${extension}`;
        const parsed = metadataXmlParser.parse("<Boundary/>", { filepath } as never);
        expect(parsed.applyMetadataTransforms).toBe(false);
      }
    }
  });
});
