import prettier from "prettier";
import { describe, expect, it } from "vitest";
import plugin from "./index.js";
import { routeFile } from "./routing.js";
import {
  AGENTFORCE_AUTHORING_TEXT_EXTENSIONS,
  GENERIC_TEXT_PAYLOAD_EXTENSIONS,
  KNOWN_TEXT_BASENAMES,
  PAYLOAD_TEXT_EXTENSIONS,
  PAYLOAD_TEXT_LANGUAGE_EXTENSIONS,
  PAYLOAD_TEXT_LANGUAGE_FILENAMES,
  STATICRESOURCE_PAYLOAD_TEXT_EXTENSIONS
} from "./shared/payload-text.js";

describe("payload-text parity contract", () => {
  it("routes Salesforce payload extensions as payload-text", () => {
    for (const extension of PAYLOAD_TEXT_EXTENSIONS) {
      const routed = routeFile(`/tmp/force-app/main/default/payload/sample${extension}`);
      expect(routed).toBe("payload-text");
    }

    for (const extension of STATICRESOURCE_PAYLOAD_TEXT_EXTENSIONS) {
      const routed = routeFile(`/tmp/force-app/main/default/staticresources/sample${extension}`);
      expect(routed).toBe("payload-text");
    }
  });

  it("does not route generic text and script extensions as Salesforce payload text", () => {
    for (const extension of GENERIC_TEXT_PAYLOAD_EXTENSIONS) {
      const routed = routeFile(`/tmp/force-app/main/default/payload/sample${extension}`);
      expect(routed).toBe("unknown");
    }
    expect(routeFile("/tmp/force-app/main/default/payload/sample.py")).toBe("unknown");
    expect(routeFile("/tmp/force-app/main/default/payload/sample.php")).toBe("unknown");
    expect(routeFile("/tmp/robot/tests/smoke.robot")).toBe("unknown");
  });

  it("routes Salesforce-specific text basenames as payload-text", () => {
    expect(routeFile("/tmp/force-app/main/default/.forceignore")).toBe("payload-text");
  });

  it("exposes inference language metadata for Salesforce payload and path-sensitive asset entries", () => {
    const extensionSet = new Set(PAYLOAD_TEXT_LANGUAGE_EXTENSIONS);
    expect(extensionSet.has(".email")).toBe(true);
    expect(extensionSet.has(".resource")).toBe(true);
    expect(extensionSet.has(".asset")).toBe(true);
    expect(extensionSet.has(".svg")).toBe(true);
    expect(extensionSet.has(".toml")).toBe(false);

    const filenameSet = new Set(PAYLOAD_TEXT_LANGUAGE_FILENAMES);
    expect(filenameSet.has(".forceignore")).toBe(true);
    expect(filenameSet.has(".env")).toBe(false);
    expect(filenameSet.has("CODEOWNERS")).toBe(false);
    expect(filenameSet.has("pre-commit")).toBe(false);
  });

  it("infers salesforce-router-by-path for representative Salesforce payload paths", async () => {
    const cases = [
      "/tmp/force-app/main/default/payload/sample.email",
      "/tmp/force-app/main/default/payload/sample.resource",
      "/tmp/force-app/main/default/payload/sample.asset",
      "/tmp/force-app/main/default/.forceignore"
    ];

    for (const filepath of cases) {
      const info = await prettier.getFileInfo(filepath, { plugins: [plugin] });
      expect(info.inferredParser).toBe("salesforce-router-by-path");
    }
  });

  it("does not infer the Salesforce router for generic text and script files", async () => {
    const cases = [
      "/tmp/force-app/main/default/payload/sample.txt",
      "/tmp/force-app/main/default/payload/sample.toml",
      "/tmp/force-app/main/default/payload/sample.snap",
      "/tmp/force-app/main/default/payload/sample.py",
      "/tmp/force-app/main/default/payload/sample.php",
      "/tmp/robot/tests/smoke.robot",
      "/tmp/force-app/main/default/.env",
      "/tmp/force-app/main/default/CODEOWNERS",
      "/tmp/force-app/main/default/pre-commit"
    ];

    for (const filepath of cases) {
      const info = await prettier.getFileInfo(filepath, { plugins: [plugin] });
      expect(info.inferredParser).not.toBe("salesforce-router-by-path");
      expect(info.inferredParser).not.toBe("salesforce-metadata-xml");
    }
  });

  it("keeps Agentforce authoring text path-scoped", () => {
    for (const extension of AGENTFORCE_AUTHORING_TEXT_EXTENSIONS) {
      expect(routeFile(`/tmp/force-app/main/default/aiAuthoringBundles/Support/v1${extension}`)).toBe("payload-text");
      expect(routeFile(`/tmp/force-app/main/default/payload/sample${extension}`)).toBe("unknown");
    }
  });

  it("keeps shared asset extensions route-scoped even when parser inference is broad", () => {
    expect(routeFile("/tmp/force-app/main/default/lwc/widget/widget.svg")).toBe("payload-text");
    expect(routeFile("/tmp/force-app/main/default/aura/Widget/Widget.svg")).toBe("payload-text");
    expect(routeFile("/tmp/force-app/main/default/payload/sample.svg")).toBe("unknown");
    expect(routeFile("/tmp/force-app/main/default/payload/sample.xml")).toBe("unknown");
  });
});
