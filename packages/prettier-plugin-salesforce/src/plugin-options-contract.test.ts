import { describe, expect, it } from "vitest";
import * as prettier from "prettier";
import plugin from "./index.js";

describe("plugin options contract", () => {
  it("exposes primary label sort option with stable key, type, and default", () => {
    const options = plugin.options ?? {};
    const entry = options.salesforceSortLabelsByFullName;
    expect(entry).toBeDefined();
    expect(entry?.type).toBe("boolean");
    expect(entry?.default).toBe(false);
    expect(entry?.category).toBe("Salesforce");
    expect(entry?.description).toContain("<labels>");
    expect(entry?.description).toContain("<fullName>");
  });

  it("exposes legacy alias for label sort option", () => {
    const options = plugin.options ?? {};
    const entry = options.salesforceSortLabelEntriesByFullName;
    expect(entry).toBeDefined();
    expect(entry?.type).toBe("boolean");
    expect(entry?.default).toBe(false);
    expect(entry?.category).toBe("Salesforce");
    expect(entry?.description).toContain("Deprecated alias");
  });

  it("does not expose unexpected Salesforce option keys", () => {
    const options = plugin.options ?? {};
    const salesforceKeys = Object.keys(options).filter((key) => key.startsWith("salesforce"));
    expect(salesforceKeys.sort()).toEqual([
      "salesforceSortLabelEntriesByFullName",
      "salesforceSortLabelsByFullName"
    ]);
  });

  it("honors Prettier tabWidth for Apex, markup, and metadata XML indentation", async () => {
    const apex = "public class Demo{public void run(){System.debug('x');}}";
    const visualforce = '<apex:page><apex:pageBlock title="Summary"><apex:outputText value="{!Account.Name}"/></apex:pageBlock></apex:page>';
    const metadata = '<CustomLabels xmlns="http://soap.sforce.com/2006/04/metadata"><labels><fullName>A</fullName><value>A</value></labels></CustomLabels>';

    const apexOut = await prettier.format(apex, {
      filepath: "force-app/main/default/classes/Demo.cls",
      tabWidth: 4,
      plugins: [plugin]
    });
    const visualforceOut = await prettier.format(visualforce, {
      filepath: "force-app/main/default/pages/Demo.page",
      tabWidth: 4,
      plugins: [plugin]
    });
    const metadataOut = await prettier.format(metadata, {
      filepath: "force-app/main/default/labels/CustomLabels.labels-meta.xml",
      tabWidth: 4,
      plugins: [plugin]
    });

    expect(apexOut).toContain("\n    public void run()");
    expect(visualforceOut).toContain("\n    <apex:pageBlock");
    expect(metadataOut).toContain("\n    <labels>");
  });
});
