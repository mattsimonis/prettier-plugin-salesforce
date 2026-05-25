import { describe, expect, it } from "vitest";
import { createPathAwareParser } from "./router.js";

describe("path-aware router parser", () => {
  it("upgrades xml-like .email payloads to metadata-xml route", () => {
    const parser = createPathAwareParser("unknown");
    const ast = parser.parse(
      "<messaging:emailTemplate><messaging:htmlEmailBody/></messaging:emailTemplate>",
      { filepath: "/tmp/force-app/main/default/email/Templates/Invoice.email" }
    );

    expect(ast.route).toBe("metadata-xml");
  });

  it("keeps plain-text .email payloads on payload-text route", () => {
    const parser = createPathAwareParser("unknown");
    const ast = parser.parse("Workflow alert for {!RelatedTo.Name}", { filepath: "/tmp/force-app/main/default/email/welcome.email" });

    expect(ast.route).toBe("payload-text");
  });

  it("upgrades .email payloads with leading comments before xml root", () => {
    const parser = createPathAwareParser("unknown");
    const ast = parser.parse(
      "<!-- generated -->\n<messaging:emailTemplate><messaging:htmlEmailBody/></messaging:emailTemplate>",
      { filepath: "/tmp/force-app/main/default/email/Templates/Invoice.email" }
    );

    expect(ast.route).toBe("metadata-xml");
  });

  it("upgrades .email payloads with UTF-8 BOM before xml root", () => {
    const parser = createPathAwareParser("unknown");
    const ast = parser.parse("\uFEFF<?xml version=\"1.0\"?><messaging:emailTemplate/>", {
      filepath: "/tmp/force-app/main/default/email/Templates/Invoice.email"
    });

    expect(ast.route).toBe("metadata-xml");
  });

  it("upgrades xml-like .resource payloads to metadata-xml route", () => {
    const parser = createPathAwareParser("unknown");
    const ast = parser.parse("<svg><g/></svg>", { filepath: "/tmp/force-app/main/default/staticresources/Icon.resource" });

    expect(ast.route).toBe("metadata-xml");
  });

  it("keeps plain-text .resource payloads on payload-text route", () => {
    const parser = createPathAwareParser("unknown");
    const ast = parser.parse("site-body", { filepath: "/tmp/force-app/main/default/staticresources/Site.resource" });

    expect(ast.route).toBe("payload-text");
  });

  it("upgrades .resource payloads with leading comments before svg root", () => {
    const parser = createPathAwareParser("unknown");
    const ast = parser.parse("<!-- sprite -->\n<svg><g/></svg>", {
      filepath: "/tmp/force-app/main/default/staticresources/Icon.resource"
    });

    expect(ast.route).toBe("metadata-xml");
  });

  it("upgrades .resource payloads with UTF-8 BOM before svg root", () => {
    const parser = createPathAwareParser("unknown");
    const ast = parser.parse("\uFEFF<svg><g/></svg>", {
      filepath: "/tmp/force-app/main/default/staticresources/Icon.resource"
    });

    expect(ast.route).toBe("metadata-xml");
  });

  it("upgrades xml-like .svg payloads to metadata-xml route", () => {
    const parser = createPathAwareParser("unknown");
    const ast = parser.parse("<svg><g/></svg>", { filepath: "/tmp/force-app/main/default/lwc/widget/widget.svg" });

    expect(ast.route).toBe("metadata-xml");
  });

  it("keeps .py unknown", () => {
    const parser = createPathAwareParser("unknown");
    const ast = parser.parse("print('ok')\n", {
      filepath: "/tmp/force-app/main/default/scripts/build.py"
    });

    expect(ast.route).toBe("unknown");
  });

  it("keeps .php unknown", () => {
    const parser = createPathAwareParser("unknown");
    const ast = parser.parse("<?php echo 'ok'; ?>\n", {
      filepath: "/tmp/force-app/main/default/scripts/posteddata.php"
    });

    expect(ast.route).toBe("unknown");
  });

  it("keeps .robot unknown", () => {
    const parser = createPathAwareParser("unknown");
    const ast = parser.parse("*** Test Cases ***\nSmoke\n", {
      filepath: "/tmp/robot/tests/lms_rest_api.robot"
    });

    expect(ast.route).toBe("unknown");
  });

  it("keeps generic payload text extensions unknown", () => {
    const parser = createPathAwareParser("unknown");
    const ast = parser.parse("release-notes", {
      filepath: "/tmp/force-app/main/default/scripts/release-notes.txt"
    });

    expect(ast.route).toBe("unknown");
  });

  it("falls back to markup route for template markup without filepath", () => {
    const parser = createPathAwareParser("unknown");
    const ast = parser.parse("<template><div>{value}</div></template>", {});

    expect(ast.route).toBe("markup");
  });

  it("falls back to markup route for unknown filepath with template markup", () => {
    const parser = createPathAwareParser("unknown");
    const ast = parser.parse("<template><div>{value}</div></template>", {
      filepath: "/tmp/exports/example.tmpl"
    });

    expect(ast.route).toBe("markup");
  });
});
