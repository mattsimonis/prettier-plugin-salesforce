import prettier from "prettier";
import { describe, expect, it } from "vitest";
import plugin from "../index.js";

describe("router printer payload text", () => {
  it("delegates ordinary html files back to Prettier core", async () => {
    const formatted = await prettier.format("<section><article><h1>Title</h1><p>Body</p></article></section>", {
      filepath: "/tmp/site/index.html",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<section>\n  <article>\n    <h1>Title</h1>\n    <p>Body</p>\n  </article>\n</section>\n"
    );
  });

  it("normalizes .email payload to one trailing newline", async () => {
    const source = "Workflow alert for {!RelatedTo.Name}\n\n";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/email/welcome.email",
      plugins: [plugin]
    });

    expect(formatted).toBe("Workflow alert for {!RelatedTo.Name}\n");
  });

  it("normalizes .resource payload to one trailing newline", async () => {
    const source = "site-body";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/staticresources/Site.resource",
      plugins: [plugin]
    });

    expect(formatted).toBe("site-body\n");
  });

  it("formats xml-like .resource content with xml formatter safeguards", async () => {
    const source = "<svg><g/></svg>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/staticresources/Icon.resource",
      plugins: [plugin]
    });

    expect(formatted).toContain("<svg>\n  <g/>\n</svg>\n");
    expect(formatted.endsWith("\n")).toBe(true);
  });

  it("formats xml-like lwc .svg payloads with xml formatter safeguards", async () => {
    const source = "<svg><g/></svg>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/lwc/widget/widget.svg",
      plugins: [plugin]
    });

    expect(formatted).toContain("<svg>\n  <g/>\n</svg>\n");
    expect(formatted.endsWith("\n")).toBe(true);
  });

  it("normalizes .asset payload to one trailing newline", async () => {
    const source = "asset-body";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/contentassets/Logo.asset",
      plugins: [plugin]
    });

    expect(formatted).toBe("asset-body\n");
  });

  it("formats xml-like .email content with xml formatter safeguards", async () => {
    const source =
      "<messaging:emailTemplate subject=\"Welcome\" recipientType=\"Contact\" relatedToType=\"Order__c\"><messaging:htmlEmailBody><c:Invoice orderId=\"{!relatedTo.Id}\"/></messaging:htmlEmailBody></messaging:emailTemplate>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/email/SampleEmailTemplates/SampleInvoice.email",
      plugins: [plugin]
    });

    expect(formatted).toContain("<messaging:emailTemplate");
    expect(formatted).toContain("\n  <messaging:htmlEmailBody>\n");
    expect(formatted.endsWith("\n")).toBe(true);
  });

  it("keeps html-table .email content stable with trailing newline", async () => {
    const source = "<table><tr><td>Hello {!Account.Name}</td></tr></table>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/email/Sample_Email_Templates/Welcome.email",
      plugins: [plugin]
    });

    expect(formatted).toContain("<table>");
    expect(formatted.endsWith("\n")).toBe(true);
  });
});
