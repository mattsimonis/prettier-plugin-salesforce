import { describe, expect, it } from "vitest";
import { detectSalesforceMarkupDialect, salesforceMarkupParser } from "./parser.js";

describe("salesforce markup parser", () => {
  it("detects visualforce mode from apex tags", () => {
    expect(detectSalesforceMarkupDialect('<apex:page><apex:form/></apex:page>')).toBe("visualforce");
  });

  it("detects aura mode from aura tags", () => {
    expect(detectSalesforceMarkupDialect('<aura:component><aura:if/></aura:component>')).toBe("aura");
  });

  it("detects lwc mode from template tags", () => {
    expect(detectSalesforceMarkupDialect("<template><div>{item.name}</div></template>")).toBe("lwc");
  });

  it.each([
    "lwc:if={show}",
    "lwc:elseif={showNext}",
    "lwc:else",
    "lwc:dom=\"manual\"",
    "lwc:slot-bind=\"slotCtx\"",
    "for:each={rows}",
    "for:item=\"row\"",
    "for:index=\"index\"",
    "iterator:row={rows}",
    "if:true={show}",
    "if:false={show}"
  ])(
    "detects lwc mode from directive attribute %s",
    (directive) => {
      expect(detectSalesforceMarkupDialect(`<c-row-card ${directive}></c-row-card>`)).toBe("lwc");
    }
  );

  it("returns unknown mode when no dialect signal is present", () => {
    expect(detectSalesforceMarkupDialect("<div>plain</div>")).toBe("unknown");
  });

  it("detects aura mode from aura namespace directive attributes on html tags", () => {
    expect(detectSalesforceMarkupDialect('<section aura:id="panel"><span>{!v.label}</span></section>')).toBe("aura");
  });

  it("detects visualforce mode from apex xmlns declaration weak signal", () => {
    expect(
      detectSalesforceMarkupDialect(
        '<html xmlns:apex="http://soap.sforce.com/2006/04/metadata"><body><span>{!Account.Name}</span></body></html>'
      )
    ).toBe("visualforce");
  });

  it("does not detect visualforce from xmlns:apex text content outside tag attributes", () => {
    const auraSource = '<aura:component><aura:text>xmlns:apex="http://soap.sforce.com/2006/04/metadata"</aura:text></aura:component>';
    const lwcSource = '<template><template>xmlns:apex="http://soap.sforce.com/2006/04/metadata"</template></template>';
    const plainSource = "<section>xmlns:apex='http://soap.sforce.com/2006/04/metadata'</section>";

    expect(detectSalesforceMarkupDialect(auraSource)).toBe("aura");
    expect(detectSalesforceMarkupDialect(lwcSource)).toBe("lwc");
    expect(detectSalesforceMarkupDialect(plainSource)).toBe("unknown");
  });

  it("ignores dialect-like directives inside comments", () => {
    const source = [
      "<section>",
      "  <!-- <c-row-card lwc:if={show} for:each={rows} /> -->",
      "  {!-- <apex:outputText value=\"{!Name}\"/> --}",
      "  <!-- <aura:text>{!v.label}</aura:text> -->",
      "</section>"
    ].join("\n");

    expect(detectSalesforceMarkupDialect(source)).toBe("unknown");
  });

  it.each([
    "<c-row-card<!-- break --> lwc:if={show}></c-row-card>",
    "<section aura<!-- break -->:id=\"panel\"></section>",
    "<apex<!-- break -->:outputText value=\"{!Name}\"/>"
  ])("does not synthesize dialect signals when comments split directive tokens: %s", (source) => {
    expect(detectSalesforceMarkupDialect(source)).toBe("unknown");
  });

  it.each([
    ["lwc", "It's quiet out here.\n<!-- <c-row-card lwc:if={show} for:each={rows}></c-row-card> -->\n<section></section>"],
    ["aura", "It's quiet out here.\n<!-- <section aura:id=\"panel\"></section> -->\n<section></section>"],
    ["visualforce", "It's quiet out here.\n<!-- <apex:outputText value=\"{!Name}\"/> -->\n<section></section>"]
  ] as const)(
    "ignores comment-only %s weak signals after apostrophes in plain text",
    (dialect, source) => {
      expect(detectSalesforceMarkupDialect(source)).toBe("unknown");
      expect(detectSalesforceMarkupDialect(source.replace("It's", "Its"))).toBe("unknown");
      expect(detectSalesforceMarkupDialect(source.replace("<!-- ", "").replace(" -->", ""))).toBe(dialect);
    }
  );

  it("detects lwc directives outside multiline html comments", () => {
    const source = [
      "<section>",
      "  <!--",
      "    <c-row-card lwc:if={hidden} for:each={rows} />",
      "  -->",
      "  <c-row-card lwc:if={show} for:each={rows}></c-row-card>",
      "</section>"
    ].join("\n");

    expect(detectSalesforceMarkupDialect(source)).toBe("lwc");
  });

  it("ignores comment-like tokens inside quoted attribute expressions while detecting dialect", () => {
    const source = [
      "<section>",
      "  <c-row-card title=\"{!IF(showPanel, '{!-- token --}', 'fallback')}\" lwc:if={showRows}></c-row-card>",
      "</section>"
    ].join("\n");

    expect(detectSalesforceMarkupDialect(source)).toBe("lwc");
  });

  it("stores detected dialect in parser output", () => {
    const parsed = salesforceMarkupParser.parse('<aura:component><div/></aura:component>', {} as never);
    expect(parsed.kind).toBe("salesforce-markup");
    expect(parsed.dialect).toBe("aura");
    expect(parsed.applySalesforceTransforms).toBe(true);
  });

  it.each([".page", ".component", ".cmp", ".app", ".evt", ".design", ".auradoc"])(
    "keeps transforms enabled for supported markup extension %s",
    (extension) => {
      const parsed = salesforceMarkupParser.parse("<div>plain</div>", {
        filepath: `/tmp/force-app/main/default/markup/sample${extension}`
      } as never);

      expect(parsed.dialect).toBe("unknown");
      expect(parsed.applySalesforceTransforms).toBe(true);
    }
  );

  it("disables transforms for non-lwc html paths", () => {
    const parsed = salesforceMarkupParser.parse("<div><span>plain</span></div>", {
      filepath: "/tmp/site/index.html"
    } as never);
    expect(parsed.dialect).toBe("unknown");
    expect(parsed.applySalesforceTransforms).toBe(false);
  });

  it("enables transforms for lwc html component paths", () => {
    const parsed = salesforceMarkupParser.parse("<template><div>{label}</div></template>", {
      filepath: "/tmp/force-app/main/default/lwc/widget/widget.html"
    } as never);
    expect(parsed.dialect).toBe("lwc");
    expect(parsed.applySalesforceTransforms).toBe(true);
  });

  it("keeps transforms disabled for template markup outside lwc component path", () => {
    const parsed = salesforceMarkupParser.parse(
      "<template><section><template if:true={show}><span>{value}</span></template></section></template>",
      {
        filepath: "/tmp/site/partials/widget.html"
      } as never
    );
    expect(parsed.dialect).toBe("lwc");
    expect(parsed.applySalesforceTransforms).toBe(false);
  });

  it("keeps transforms enabled for nested lwc component html in windows-style paths", () => {
    const parsed = salesforceMarkupParser.parse(
      "<template><section><template if:true={show}><span>{value}</span></template></section></template>",
      {
        filepath: "C:\\repo\\force-app\\main\\default\\lwc\\recordList\\recordList.html"
      } as never
    );
    expect(parsed.dialect).toBe("lwc");
    expect(parsed.applySalesforceTransforms).toBe(true);
  });

  it("infers lwc dialect from unix component path when template signal is missing", () => {
    const parsed = salesforceMarkupParser.parse("<section><span>{value}</span></section>", {
      filepath: "/tmp/force-app/main/default/lwc/recordList/recordList.html"
    } as never);

    expect(parsed.dialect).toBe("lwc");
    expect(parsed.applySalesforceTransforms).toBe(true);
  });

  it("infers lwc dialect from windows component path when template signal is missing", () => {
    const parsed = salesforceMarkupParser.parse("<section><span>{value}</span></section>", {
      filepath: "C:\\tmp\\force-app\\main\\default\\lwc\\recordList\\recordList.html"
    } as never);

    expect(parsed.dialect).toBe("lwc");
    expect(parsed.applySalesforceTransforms).toBe(true);
  });

  it("does not infer lwc dialect for html files under lwc when file name differs from component name", () => {
    const parsed = salesforceMarkupParser.parse("<section><span>{value}</span></section>", {
      filepath: "/tmp/force-app/main/default/lwc/recordList/record-list.html"
    } as never);

    expect(parsed.dialect).toBe("unknown");
    expect(parsed.applySalesforceTransforms).toBe(false);
  });
});
