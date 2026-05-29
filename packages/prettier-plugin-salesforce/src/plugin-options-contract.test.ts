import { describe, expect, it } from "vitest";
import * as prettier from "prettier";
import plugin from "./index.js";

describe("plugin options contract", () => {
  it("uses the Apex style-guide column limit as the Salesforce printWidth default", () => {
    expect(plugin.defaultOptions?.printWidth).toBe(120);
  });

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

  it("does not expose unexpected Salesforce option keys", () => {
    const options = plugin.options ?? {};
    const salesforceKeys = Object.keys(options).filter((key) =>
      key.startsWith("salesforce"),
    );
    expect(salesforceKeys.sort()).toEqual([
      "salesforceBlankLineBeforeLineComment",
      "salesforceFinalNewline",
      "salesforceLogicalOperatorPosition",
      "salesforceSortLabelsByFullName",
      "salesforceTestVisiblePlacement",
    ]);
  });

  it("exposes final newline option with stable key, type, and default", () => {
    const options = plugin.options ?? {};
    const entry = options.salesforceFinalNewline;
    expect(entry).toBeDefined();
    expect(entry?.type).toBe("boolean");
    expect(entry?.default).toBe(true);
    expect(entry?.category).toBe("Salesforce");
    expect(entry?.description).toContain("trailing newline");
  });

  it("exposes Apex formatting options with stable keys, types, and defaults", () => {
    const options = plugin.options ?? {};
    expect(options.salesforceTestVisiblePlacement?.type).toBe("choice");
    expect(options.salesforceTestVisiblePlacement?.default).toBe("own-line");
    expect(options.salesforceBlankLineBeforeLineComment?.type).toBe("boolean");
    expect(options.salesforceBlankLineBeforeLineComment?.default).toBe(false);
    expect(options.salesforceLogicalOperatorPosition?.type).toBe("choice");
    expect(options.salesforceLogicalOperatorPosition?.default).toBe(
      "end-of-line",
    );
  });

  it("honors Prettier tabWidth for Apex, markup, and metadata XML indentation", async () => {
    const apex = "public class Demo{public void run(){System.debug('x');}}";
    const visualforce =
      '<apex:page><apex:pageBlock title="Summary"><apex:outputText value="{!Account.Name}"/></apex:pageBlock></apex:page>';
    const metadata =
      '<CustomLabels xmlns="http://soap.sforce.com/2006/04/metadata"><labels><fullName>A</fullName><value>A</value></labels></CustomLabels>';

    const apexOut = await prettier.format(apex, {
      filepath: "force-app/main/default/classes/Demo.cls",
      tabWidth: 4,
      plugins: [plugin],
    });
    const visualforceOut = await prettier.format(visualforce, {
      filepath: "force-app/main/default/pages/Demo.page",
      tabWidth: 4,
      plugins: [plugin],
    });
    const metadataOut = await prettier.format(metadata, {
      filepath: "force-app/main/default/labels/CustomLabels.labels-meta.xml",
      tabWidth: 4,
      plugins: [plugin],
    });

    expect(apexOut).toContain("\n    public void run()");
    expect(visualforceOut).toContain("\n    <apex:pageBlock");
    expect(metadataOut).toContain("\n    <labels>");
  });

  it("honors salesforceFinalNewline false for Salesforce-owned printers", async () => {
    const apexOut = await prettier.format("public class Demo{}", {
      parser: "salesforce-apex",
      salesforceFinalNewline: false,
      plugins: [plugin],
    });
    const markupOut = await prettier.format(
      "<apex:page><apex:outputText/></apex:page>",
      {
        parser: "salesforce-markup",
        salesforceFinalNewline: false,
        plugins: [plugin],
      },
    );
    const metadataOut = await prettier.format(
      "<CustomObject><label>Widget</label></CustomObject>",
      {
        parser: "salesforce-metadata-xml",
        salesforceFinalNewline: false,
        plugins: [plugin],
      },
    );
    const payloadOut = await prettier.format("plain payload\n\n", {
      filepath: "force-app/main/default/email/Notice.email",
      salesforceFinalNewline: false,
      plugins: [plugin],
    });

    expect(apexOut.endsWith("\n")).toBe(false);
    expect(markupOut.endsWith("\n")).toBe(false);
    expect(metadataOut.endsWith("\n")).toBe(false);
    expect(payloadOut.endsWith("\n")).toBe(false);
  });
});
