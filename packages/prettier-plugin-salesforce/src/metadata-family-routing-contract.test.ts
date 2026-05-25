import { describe, expect, it } from "vitest";
import { METADATA_XML_FAMILIES } from "./metadata-families.js";
import { routeFile } from "./routing.js";

describe("metadata family routing contract", () => {
  it("routes each metadata family directory and extension to metadata-xml", () => {
    for (const family of METADATA_XML_FAMILIES) {
      for (const extension of [family.routingExtension, ...family.languageExtensions]) {
        const filepath = `/tmp/force-app/main/default/${family.directory}/Sample${extension}`;
        expect(routeFile(filepath)).toBe("metadata-xml");
      }
    }
  });

  it("routes each metadata family alias directory to metadata-xml", () => {
    for (const family of METADATA_XML_FAMILIES) {
      for (const alias of family.routingDirectoryAliases) {
        const filepath = `/tmp/force-app/main/default/${alias}/Sample${family.routingExtension}`;
        expect(routeFile(filepath)).toBe("metadata-xml");
      }
    }
  });
});
