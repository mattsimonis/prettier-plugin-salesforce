import prettier from "prettier";
import { describe, expect, it } from "vitest";
import plugin from "./index.js";
import { routeFile } from "./routing.js";
import { metadataCanonicalFamilyFromPath } from "./metadata-family-routing.js";

type AmbiguousCase = {
  filepath: string;
  expectedRoute: ReturnType<typeof routeFile>;
  expectedFamily: string | null;
  expectedParser: string | null;
};

const cases: AmbiguousCase[] = [
  {
    filepath: "/tmp/force-app/main/default/aura/MyBundle/MyBundle.app",
    expectedRoute: "markup",
    expectedFamily: "auradefinitionbundles",
    expectedParser: "salesforce-router-by-path"
  },
  {
    filepath: "/tmp/force-app/main/default/applications/Sales.app",
    expectedRoute: "metadata-xml",
    expectedFamily: "applications",
    expectedParser: "salesforce-router-by-path"
  },
  {
    filepath: "/tmp/exports/Sales.app",
    expectedRoute: "metadata-xml",
    expectedFamily: "applications",
    expectedParser: "salesforce-router-by-path"
  },
  {
    filepath: "exports/Sales.app",
    expectedRoute: "metadata-xml",
    expectedFamily: "applications",
    expectedParser: "salesforce-router-by-path"
  },
  {
    filepath: "/tmp/exports/Feature.Default.md",
    expectedRoute: "metadata-xml",
    expectedFamily: "custommetadata",
    expectedParser: "salesforce-router-by-path"
  },
  {
    filepath: "exports/Feature.Default.md",
    expectedRoute: "metadata-xml",
    expectedFamily: "custommetadata",
    expectedParser: "salesforce-router-by-path"
  },
  {
    filepath: "/tmp/force-app/main/default/customMetadata/README.md",
    expectedRoute: "prettier-core",
    expectedFamily: "custommetadata",
    expectedParser: "salesforce-router-by-path"
  },
  {
    filepath: "/tmp/force-app/main/default/aura/MyBundle/MyBundle.app-meta.xml",
    expectedRoute: "metadata-xml",
    expectedFamily: "auradefinitionbundles",
    expectedParser: "salesforce-metadata-xml"
  },
  {
    filepath: "/tmp/force-app/main/default/applications/Sales.app-meta.xml",
    expectedRoute: "metadata-xml",
    expectedFamily: "applications",
    expectedParser: "salesforce-metadata-xml"
  },
  {
    filepath: "/tmp/force-app/main/default/aura/MyBundle/MyBundle.js-meta.xml",
    expectedRoute: "metadata-xml",
    expectedFamily: "auradefinitionbundles",
    expectedParser: "salesforce-metadata-xml"
  },
  {
    filepath: "/tmp/force-app/main/default/lwc/myBundle/myBundle.js-meta.xml",
    expectedRoute: "metadata-xml",
    expectedFamily: "lightningcomponentbundles",
    expectedParser: "salesforce-metadata-xml"
  }
];

describe("metadata ambiguous inference contract", () => {
  it.each(cases)("keeps route, family, and inferred parser aligned for $filepath", async (entry) => {
    expect(routeFile(entry.filepath)).toBe(entry.expectedRoute);
    expect(metadataCanonicalFamilyFromPath(entry.filepath.toLowerCase())).toBe(entry.expectedFamily);

    const info = await prettier.getFileInfo(entry.filepath, { plugins: [plugin] });
    expect(info.inferredParser).toBe(entry.expectedParser);
  });
});
