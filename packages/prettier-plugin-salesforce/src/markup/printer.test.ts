import prettier from "prettier";
import { describe, expect, it } from "vitest";
import plugin from "../index.js";

describe("salesforce markup printer", () => {
  it("breaks adjacent Visualforce tags and preserves expressions", async () => {
    const source = '<apex:page><apex:outputField value="{!Account.Name}"/></apex:page>';
    const formatted = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toBe('<apex:page>\n  <apex:outputField value="{!Account.Name}"/>\n</apex:page>\n');
  });

  it("expands inline apex expression blocks by visualforce dialect rule", async () => {
    const source = "<apex:page><apex:outputText>{!Account.Name}</apex:outputText></apex:page>";
    const formatted = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<apex:page>\n  <apex:outputText>\n    {!Account.Name}\n  </apex:outputText>\n</apex:page>\n"
    );
  });

  it("indents nested aura tags and preserves expression syntax", async () => {
    const source =
      '<aura:component><aura:iteration items="{!v.items}" var="item"><p>{!item.Name}</p></aura:iteration></aura:component>';
    const formatted = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      '<aura:component>\n  <aura:iteration items="{!v.items}" var="item">\n    <p>{!item.Name}</p>\n  </aura:iteration>\n</aura:component>\n'
    );
  });

  it("expands inline aura expression blocks by aura dialect rule", async () => {
    const source = "<aura:component><aura:text>{!v.label}</aura:text></aura:component>";
    const formatted = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toBe("<aura:component>\n  <aura:text>\n    {!v.label}\n  </aura:text>\n</aura:component>\n");
  });

  it("preserves lwc expressions while formatting template markup", async () => {
    const source = "<template><div>{item.name}</div><template if:true={hasData}><span>{value}</span></template></template>";
    const formatted = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<template>\n  <div>{item.name}</div>\n  <template if:true={hasData}>\n    <span>{value}</span>\n  </template>\n</template>\n"
    );
  });

  it("expands inline template text in lwc while preserving expression text", async () => {
    const source = "<template><template>{item.name}</template></template>";
    const formatted = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toBe("<template>\n  <template>\n    {item.name}\n  </template>\n</template>\n");
  });

  it("passes through non-lwc html files without salesforce transforms", async () => {
    const source = "<div><span>{value}</span></div>\n";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/site/index.html",
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toBe(source);
  });

  it("applies lwc transforms for lwc-style html component paths", async () => {
    const source = "<template><template>{item.name}</template></template>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/lwc/widget/widget.html",
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toBe("<template>\n  <template>\n    {item.name}\n  </template>\n</template>\n");
  });

  it("passes through nested template markup for non-lwc html paths", async () => {
    const source =
      "<template><section class=\"content\"><template if:true={showPanel}><article><h2>{title}</h2><p>{summary}</p></article></template></section></template>\n";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/www/partials/promo-card.html",
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toBe(source);
  });

  it("formats nested template markup for lwc html component paths", async () => {
    const source =
      "<template><section class=\"content\"><template if:true={showPanel}><article><h2>{title}</h2><p>{summary}</p></article></template></section></template>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/lwc/promoCard/promoCard.html",
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<template>\n  <section class=\"content\">\n    <template if:true={showPanel}>\n      <article>\n        <h2>{title}</h2>\n        <p>{summary}</p>\n      </article>\n    </template>\n  </section>\n</template>\n"
    );
  });

  it("formats weak-signal markup in lwc component paths using path inference", async () => {
    const source = "<section><span>{value}</span></section>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/lwc/promoCard/promoCard.html",
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toBe("<section>\n  <span>{value}</span>\n</section>\n");
  });

  it("preserves lwc directive and handler attribute expression text exactly", async () => {
    const source =
      "<template><template for:each={ items } for:item=\"item\" if:true={ hasRows } lwc:if={ showRows }><div key={ item.Id } onclick={ handleClick } onkeydown={ handleKeyDown }>{ item.Name }</div></template></template>";
    const formatted = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toContain('for:each={ items }');
    expect(formatted).toContain('if:true={ hasRows }');
    expect(formatted).toContain('lwc:if={ showRows }');
    expect(formatted).toContain('onclick={ handleClick }');
    expect(formatted).toContain('onkeydown={ handleKeyDown }');
    expect(formatted).toContain('key={ item.Id }');
    expect(formatted).toContain('{ item.Name }');
    expect(formatted).toBe(
      "<template>\n  <template\n    for:each={ items }\n    for:item=\"item\"\n    if:true={ hasRows }\n    lwc:if={ showRows }\n  >\n    <div key={ item.Id } onclick={ handleClick } onkeydown={ handleKeyDown }>{ item.Name }</div>\n  </template>\n</template>\n"
    );
  });

  it("preserves raw script text that contains comparison operators", async () => {
    const source = "<apex:page><script>if (a < b) { console.log(a); }</script></apex:page>";
    const formatted = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<apex:page>\n  <script>\n    if (a < b) { console.log(a); }\n  </script>\n</apex:page>\n"
    );
  });

  it("formats attribute-only lwc directive markup and preserves expression bytes", async () => {
    const source =
      "<c-row-card lwc:if={  row.IsVisible  } for:each={  rowsByGroup [ groupKey ]  } for:item=\"row\" data-name={ row.Name }></c-row-card>";
    const first = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const second = await prettier.format(first, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(first).toContain("lwc:if={  row.IsVisible  }");
    expect(first).toContain("for:each={  rowsByGroup [ groupKey ]  }");
    expect(first).toContain("data-name={ row.Name }");
    expect(first).toBe(
      "<c-row-card\n  lwc:if={  row.IsVisible  }\n  for:each={  rowsByGroup [ groupKey ]  }\n  for:item=\"row\"\n  data-name={ row.Name }\n>\n</c-row-card>\n"
    );
    expect(second).toBe(first);
  });

  it("passes through non-lwc html files that contain lwc-looking directive attributes", async () => {
    const source = "<c-row-card lwc:if={show} for:each={rows}><span>{value}</span></c-row-card>\n";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/site/fragments/row-card.html",
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toBe(source);
  });

  it("passes through non-lwc html files that contain other lwc directive attributes", async () => {
    const source =
      "<section><div lwc:dom=\"manual\"></div><template lwc:slot-bind=\"slotCtx\"><span>{value}</span></template></section>\n";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/site/fragments/manual-dom-slot.html",
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toBe(source);
  });

  it("passes through non-lwc html files that contain if:true and if:false directive attributes", async () => {
    const source = "<section><template if:true={showPanel}><p>{value}</p></template><template if:false={showPanel}><p>{fallback}</p></template></section>\n";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/site/fragments/conditional-panel.html",
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toBe(source);
  });

  it("passes through non-lwc html files that contain iterator and for:item weak-signal directives", async () => {
    const source = "<template iterator:row={rows}><article key={row.value.Id}>{row.value.Name}</article></template>\n";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/site/fragments/iterator-row.html",
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toBe(source);
  });

  it("passes through non-lwc html files when lwc-like directives appear only in comments", async () => {
    const source =
      "<section><!-- <c-row-card lwc:if={show} for:each={rows} /> --><span>{value}</span><!-- <template lwc:else /> --></section>\n";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/site/fragments/comment-only-directives.html",
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toBe(source);
  });

  it("passes through non-lwc html files when comments split directive-like tokens", async () => {
    const source = "<section><c-row-card<!-- split --> lwc:if={show}><span>{value}</span></c-row-card></section>\n";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/site/fragments/comment-split-directive.html",
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toBe(source);
  });

  it("preserves exact attribute expression whitespace for lwc directives", async () => {
    const source =
      "<template><template for:each={  itemsByGroup [ key ]  } if:true={  hasRows  } lwc:if={  shouldShowRows( rowCount )  }><div onclick={  handleClick  }>{value}</div></template></template>";
    const formatted = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toContain("for:each={  itemsByGroup [ key ]  }");
    expect(formatted).toContain("if:true={  hasRows  }");
    expect(formatted).toContain("lwc:if={  shouldShowRows( rowCount )  }");
    expect(formatted).toContain("onclick={  handleClick  }");
  });

  it("preserves nested lwc directive whitespace at depth", async () => {
    const source =
      "<template><template if:true={  hasGroups  }><template for:each={  groupedRows [ groupKey ]  } for:item=\"row\"><div key={  row.Id  }><template lwc:if={  shouldShowRow( row )  }><button onclick={  handlePick( row.Id )  }>{  row.Label  }</button></template></div></template></template></template>";
    const first = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const second = await prettier.format(first, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(first).toContain("if:true={  hasGroups  }");
    expect(first).toContain("for:each={  groupedRows [ groupKey ]  }");
    expect(first).toContain("key={  row.Id  }");
    expect(first).toContain("lwc:if={  shouldShowRow( row )  }");
    expect(first).toContain("onclick={  handlePick( row.Id )  }");
    expect(first).toContain("{  row.Label  }");
    expect(second).toBe(first);
  });

  it("is idempotent for lwc directives and event handlers", async () => {
    const source =
      "<template><template for:each={items} for:item=\"item\"><button if:true={item.enabled} lwc:if={showActions} onclick={handleClick} onfocus={handleFocus}>{item.label}</button></template></template>";
    const first = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const second = await prettier.format(first, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(second).toBe(first);
  });

  it("preserves nested visualforce expression text and stays idempotent", async () => {
    const source =
      "<apex:page><apex:form><apex:pageBlock><apex:outputPanel rendered=\"{!NOT(ISBLANK(Account.OwnerId))}\"><apex:outputText>{!IF(Account.IsActive__c, Account.Owner.Name, Account.CreatedBy.Name)}</apex:outputText></apex:outputPanel></apex:pageBlock></apex:form></apex:page>";
    const first = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const second = await prettier.format(first, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(first).toContain('rendered="{!NOT(ISBLANK(Account.OwnerId))}"');
    expect(first).toContain("{!IF(Account.IsActive__c, Account.Owner.Name, Account.CreatedBy.Name)}");
    expect(second).toBe(first);
  });

  it("preserves nested visualforce brace whitespace exactly", async () => {
    const source =
      "<apex:page><apex:form><apex:outputPanel rendered=\"{!  OR( Account.IsActive__c , NOT(ISBLANK(Account.OwnerId)) )  }\"><apex:outputText>{!  IF( Account.IsActive__c , Account.Owner.Name , Account.CreatedBy.Name )  }</apex:outputText></apex:outputPanel></apex:form></apex:page>";
    const first = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const second = await prettier.format(first, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(first).toContain('rendered="{!  OR( Account.IsActive__c , NOT(ISBLANK(Account.OwnerId)) )  }"');
    expect(first).toContain("{!  IF( Account.IsActive__c , Account.Owner.Name , Account.CreatedBy.Name )  }");
    expect(second).toBe(first);
  });

  it("preserves nested aura expression text and stays idempotent", async () => {
    const source =
      "<aura:component><aura:if isTrue=\"{!v.showRows}\"><aura:iteration items=\"{!v.items}\" var=\"item\"><aura:text>{!item.Name + ' - ' + v.suffix}</aura:text></aura:iteration><aura:set attribute=\"else\"><aura:text>{!v.emptyLabel}</aura:text></aura:set></aura:if></aura:component>";
    const first = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const second = await prettier.format(first, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(first).toContain('isTrue="{!v.showRows}"');
    expect(first).toContain('items="{!v.items}"');
    expect(first).toContain("{!item.Name + ' - ' + v.suffix}");
    expect(first).toContain("{!v.emptyLabel}");
    expect(second).toBe(first);
  });

  it("preserves nested aura brace whitespace exactly", async () => {
    const source =
      "<aura:component><aura:if isTrue=\"{!  v.showRows  }\"><aura:iteration items=\"{!  v.itemsByGroup [ v.groupKey ]  }\" var=\"item\"><aura:text>{!  item.Name + ' - ' + v.suffix  }</aura:text></aura:iteration><aura:set attribute=\"else\"><aura:text>{!  v.emptyLabel  }</aura:text></aura:set></aura:if></aura:component>";
    const first = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const second = await prettier.format(first, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(first).toContain('isTrue="{!  v.showRows  }"');
    expect(first).toContain('items="{!  v.itemsByGroup [ v.groupKey ]  }"');
    expect(first).toContain("{!  item.Name + ' - ' + v.suffix  }");
    expect(first).toContain("{!  v.emptyLabel  }");
    expect(second).toBe(first);
  });

  it("keeps mixed self-closing and inline expression tags stable in visualforce", async () => {
    const source =
      '<apex:page><apex:outputPanel rendered="{!showPanel}"><apex:outputField value="{!Account.Name}"/><apex:outputText>{!Account.Owner.Name}</apex:outputText><apex:outputField value="{!Account.Number}"/></apex:outputPanel></apex:page>';
    const first = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const second = await prettier.format(first, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(first).toContain('<apex:outputField value="{!Account.Name}"/>');
    expect(first).toContain("<apex:outputText>");
    expect(first).toContain("{!Account.Owner.Name}");
    expect(first).toContain('<apex:outputField value="{!Account.Number}"/>');
    expect(second).toBe(first);
  });

  it("keeps multiline Visualforce comments transparent for inline expansion adjacency", async () => {
    const source = [
      "<apex:page>",
      '  <apex:outputField value="{!Account.Name}"/>',
      "  {!--",
      "    keep this comment",
      "  --}",
      "  <div>{!Account.Owner.Name}</div>",
      "</apex:page>"
    ].join("\n");

    const formatted = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toContain("  <div>\n    {!Account.Owner.Name}\n  </div>");
  });

  it("keeps multiline Aura comments transparent for inline expansion adjacency", async () => {
    const source = [
      "<aura:component>",
      '  <aura:text value="{!v.label}"/>',
      "  <!--",
      "    keep this comment",
      "  -->",
      "  <div>{!v.label}</div>",
      "</aura:component>"
    ].join("\n");

    const formatted = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toContain("  <div>\n    {!v.label}\n  </div>");
  });

  it("keeps mixed self-closing and inline expression tags stable in aura", async () => {
    const source =
      '<aura:component><aura:if isTrue="{!v.show}"><aura:html tag="span"/><aura:text>{!v.label}</aura:text><aura:unescapedHtml value="{!v.content}"/></aura:if></aura:component>';
    const first = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const second = await prettier.format(first, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(first).toContain("<aura:text>");
    expect(first).toContain("{!v.label}");
    expect(first).toContain('<aura:html tag="span"/>');
    expect(first).toContain('<aura:unescapedHtml value="{!v.content}"/>');
    expect(second).toBe(first);
  });

  it("keeps nested mixed self-closing and expression whitespace stable in visualforce", async () => {
    const source =
      '<apex:page><apex:outputPanel rendered="{!  showPanel  }"><apex:outputField value="{!Account.Name}"/><apex:outputPanel><apex:outputText>{!  Account.Owner.Name  }</apex:outputText><apex:outputField value="{!Account.Number}"/></apex:outputPanel></apex:outputPanel></apex:page>';
    const first = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const second = await prettier.format(first, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(first).toContain('rendered="{!  showPanel  }"');
    expect(first).toContain("{!  Account.Owner.Name  }");
    expect(first).toContain('<apex:outputField value="{!Account.Name}"/>');
    expect(first).toContain('<apex:outputField value="{!Account.Number}"/>');
    expect(second).toBe(first);
  });

  it("keeps nested mixed self-closing and expression whitespace stable in aura", async () => {
    const source =
      '<aura:component><aura:if isTrue="{!  v.showRows  }"><aura:html tag="span"/><aura:iteration items="{!  v.items  }" var="item"><aura:text>{!  item.Name + \' - \' + v.suffix  }</aura:text><aura:unescapedHtml value="{!v.content}"/></aura:iteration></aura:if></aura:component>';
    const first = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const second = await prettier.format(first, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(first).toContain('isTrue="{!  v.showRows  }"');
    expect(first).toContain('items="{!  v.items  }"');
    expect(first).toContain("{!  item.Name + ' - ' + v.suffix  }");
    expect(first).toContain('<aura:html tag="span"/>');
    expect(first).toContain('<aura:unescapedHtml value="{!v.content}"/>');
    expect(second).toBe(first);
  });

  it("keeps nested mixed self-closing and expression whitespace stable in lwc", async () => {
    const source =
      "<template><template if:true={  hasRows  }><lightning-icon icon-name=\"utility:user\"/><template for:each={  rowsByGroup [ groupKey ]  } for:item=\"row\"><div key={  row.Id  }><template lwc:if={  shouldShow( row )  }><span>{  row.Label  }</span><lightning-badge label={ row.Badge }/></template></div></template></template></template>";
    const first = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const second = await prettier.format(first, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(first).toContain("if:true={  hasRows  }");
    expect(first).toContain("for:each={  rowsByGroup [ groupKey ]  }");
    expect(first).toContain("key={  row.Id  }");
    expect(first).toContain("lwc:if={  shouldShow( row )  }");
    expect(first).toContain("{  row.Label  }");
    expect(first).toContain('<lightning-icon icon-name="utility:user"/>');
    expect(first).toContain("<lightning-badge label={ row.Badge }/>");
    expect(second).toBe(first);
  });

  it("preserves nested visualforce directive-bearing structures with adjacent self-closing tags", async () => {
    const source =
      '<apex:page><apex:outputPanel rendered="{!  AND( showPanel , NOT(ISBLANK(Account.OwnerId)) )  }"><apex:outputField value="{!Account.Name}"/><apex:outputPanel rendered="{!  showDetails  }"><apex:facet name="footer"/><apex:outputText>{!  IF(showDetails, Account.Owner.Name + \' / \' + Account.CreatedBy.Name, Account.Name)  }</apex:outputText><apex:outputField value="{!Account.Number}"/></apex:outputPanel><apex:outputText>{!  Account.Industry  }</apex:outputText></apex:outputPanel></apex:page>';
    const first = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const second = await prettier.format(first, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(first).toContain('rendered="{!  AND( showPanel , NOT(ISBLANK(Account.OwnerId)) )  }"');
    expect(first).toContain('rendered="{!  showDetails  }"');
    expect(first).toContain("{!  IF(showDetails, Account.Owner.Name + ' / ' + Account.CreatedBy.Name, Account.Name)  }");
    expect(first).toContain("{!  Account.Industry  }");
    expect(first).toContain('<apex:facet name="footer"/>');
    expect(first).toContain('<apex:outputField value="{!Account.Name}"/>');
    expect(first).toContain('<apex:outputField value="{!Account.Number}"/>');
    expect(second).toBe(first);
  });

  it("preserves nested aura directive-bearing structures with adjacent self-closing tags", async () => {
    const source =
      '<aura:component><aura:if isTrue="{!  v.showRows  }"><aura:iteration items="{!  v.itemsByGroup [ v.groupKey ]  }" var="item"><aura:html tag="span"/><aura:if isTrue="{!  item.IsVisible  }"><aura:text>{!  item.Name + \' / \' + v.suffix  }</aura:text><aura:unescapedHtml value="{!v.contentMap[item.Id]}"/><aura:set attribute="else"><aura:text>{!  v.emptyLabel  }</aura:text></aura:set></aura:if><aura:html tag="br"/></aura:iteration></aura:if></aura:component>';
    const first = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const second = await prettier.format(first, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(first).toContain('isTrue="{!  v.showRows  }"');
    expect(first).toContain('items="{!  v.itemsByGroup [ v.groupKey ]  }"');
    expect(first).toContain('isTrue="{!  item.IsVisible  }"');
    expect(first).toContain("{!  item.Name + ' / ' + v.suffix  }");
    expect(first).toContain("{!  v.emptyLabel  }");
    expect(first).toContain('<aura:html tag="span"/>');
    expect(first).toContain('<aura:html tag="br"/>');
    expect(first).toContain('<aura:unescapedHtml value="{!v.contentMap[item.Id]}"/>');
    expect(second).toBe(first);
  });

  it("preserves nested lwc directives with adjacent self-closing tags and mixed expression text", async () => {
    const source =
      "<template><template if:true={  hasGroups  }><template for:each={  groupedRows [ groupKey ]  } for:item=\"row\"><section key={  row.Id  }><lightning-icon icon-name=\"utility:user\"/><template lwc:if={  shouldShowRow( row )  }><lightning-badge label={ row.Badge }/><span>{  row.Label + ' / ' + row.Value  }</span></template><template if:false={  shouldShowRow( row )  }><lightning-helptext content={ row.Help }/></template></section></template></template></template>";
    const first = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const second = await prettier.format(first, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(first).toContain("if:true={  hasGroups  }");
    expect(first).toContain("for:each={  groupedRows [ groupKey ]  }");
    expect(first).toContain("key={  row.Id  }");
    expect(first).toContain("lwc:if={  shouldShowRow( row )  }");
    expect(first).toContain("if:false={  shouldShowRow( row )  }");
    expect(first).toContain("{  row.Label + ' / ' + row.Value  }");
    expect(first).toContain('<lightning-icon icon-name="utility:user"/>');
    expect(first).toContain("<lightning-badge label={ row.Badge }/>");
    expect(first).toContain("<lightning-helptext content={ row.Help }/>");
    expect(second).toBe(first);
  });

  it("does not expand mixed text inline blocks that are not pure expressions", async () => {
    const source = "<apex:page><apex:outputText>Hello {!Account.Name}</apex:outputText></apex:page>";
    const formatted = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toContain("<apex:outputText>Hello {!Account.Name}</apex:outputText>");
  });

  it("does not expand malformed expression wrappers in lwc inline template text", async () => {
    const source = "<template><template>{ value }</template><template>{{value}</template></template>";
    const formatted = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toContain("<template>\n    { value }\n  </template>");
    expect(formatted).toContain("<template>{{value}</template>");
  });

  it("keeps nested lwc template wrappers readable with safe inline expansion", async () => {
    const source =
      "<template><template if:true={hasData}><template for:each={rows} for:item=\"row\"><template lwc:if={row.visible}>{ row.Name }</template><lightning-icon icon-name=\"utility:user\"/></template></template></template>";
    const formatted = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toContain("<template lwc:if={row.visible}>");
    expect(formatted).toContain("  { row.Name }");
    expect(formatted).toContain('<lightning-icon icon-name="utility:user"/>');
  });

  it("expands non-template lwc expression tags when adjacent to self-closing siblings", async () => {
    const source =
      "<template><template if:true={hasRows}><lightning-icon icon-name=\"utility:user\"/><span>{  row.Label + ' / ' + row.Value  }</span><lightning-badge label={row.Badge}/></template></template>";
    const formatted = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toContain('<lightning-icon icon-name="utility:user"/>');
    expect(formatted).toContain("<span>");
    expect(formatted).toContain("  {  row.Label + ' / ' + row.Value  }");
    expect(formatted).toContain("</span>");
    expect(formatted).toContain("<lightning-badge label={row.Badge}/>");
  });

  it("expands non-namespaced visualforce html expression tags when adjacent to self-closing siblings", async () => {
    const source =
      '<apex:page><apex:outputPanel rendered="{!showPanel}"><apex:outputField value="{!Account.Name}"/><span>{!  Account.Owner.Name  }</span><apex:outputField value="{!Account.Number}"/></apex:outputPanel></apex:page>';
    const formatted = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toContain('<apex:outputField value="{!Account.Name}"/>');
    expect(formatted).toContain("<span>");
    expect(formatted).toContain("  {!  Account.Owner.Name  }");
    expect(formatted).toContain("</span>");
    expect(formatted).toContain('<apex:outputField value="{!Account.Number}"/>');
  });

  it("expands non-namespaced aura html expression tags when adjacent to self-closing siblings", async () => {
    const source =
      '<aura:component><aura:if isTrue="{!v.show}"><aura:html tag="span"/><p>{!  v.label + \' / \' + v.suffix  }</p><aura:unescapedHtml value="{!v.content}"/></aura:if></aura:component>';
    const formatted = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(formatted).toContain('<aura:html tag="span"/>');
    expect(formatted).toContain("<p>");
    expect(formatted).toContain("  {!  v.label + ' / ' + v.suffix  }");
    expect(formatted).toContain("</p>");
    expect(formatted).toContain('<aura:unescapedHtml value="{!v.content}"/>');
  });

  it("detects self-closing siblings when attribute values contain greater-than characters", async () => {
    const visualforceSource =
      '<apex:page><apex:outputPanel><apex:outputText value="A > B"/><span>{!  Account.Owner.Name  }</span><apex:outputField value="{!Account.Number}"/></apex:outputPanel></apex:page>';
    const auraSource =
      '<aura:component><aura:if isTrue="{!v.show}"><aura:html title="{!v.left + \'>\' + v.right}"/><p>{!  v.label + \' / \' + v.suffix  }</p><aura:unescapedHtml value="{!v.content}"/></aura:if></aura:component>';
    const lwcSource =
      "<template><template if:true={hasRows}><lightning-icon alternative-text={left + '>' + right}/><span>{  row.Label + ' / ' + row.Value  }</span><lightning-badge label={row.Badge}/></template></template>";

    const visualforceFormatted = await prettier.format(visualforceSource, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const auraFormatted = await prettier.format(auraSource, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const lwcFormatted = await prettier.format(lwcSource, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(visualforceFormatted).toContain('<apex:outputText value="A > B"/>');
    expect(visualforceFormatted).toContain("<span>");
    expect(visualforceFormatted).toContain("  {!  Account.Owner.Name  }");
    expect(visualforceFormatted).toContain("</span>");
    expect(auraFormatted).toContain('<aura:html title="{!v.left + \'>\' + v.right}"/>');
    expect(auraFormatted).toContain("<p>");
    expect(auraFormatted).toContain("  {!  v.label + ' / ' + v.suffix  }");
    expect(auraFormatted).toContain("</p>");
    expect(lwcFormatted).toContain("<lightning-icon alternative-text={left + '>' + right}/>");
    expect(lwcFormatted).toContain("<span>");
    expect(lwcFormatted).toContain("  {  row.Label + ' / ' + row.Value  }");
    expect(lwcFormatted).toContain("</span>");
  });

  it("ignores comment tokens inside quoted attribute expressions when checking sibling depth", async () => {
    const visualforceSource =
      '<apex:page><apex:outputPanel><apex:outputField value="{!IF(showPanel, \'{!-- token\', \'fallback\')}"/><p>{!  Account.Name  }</p></apex:outputPanel></apex:page>';
    const auraSource =
      '<aura:component><aura:if isTrue="{!v.show}"><aura:html title="{!IF(v.showPanel, \'{!-- token\', \'fallback\')}"/><p>{!  v.label + \' / \' + v.suffix  }</p></aura:if></aura:component>';
    const lwcSource =
      "<section><lightning-icon alternative-text={showPanel ? '{!-- token' : 'fallback'}/><span>{  row.Label + ' / ' + row.Value  }</span></section>";

    const visualforceFormatted = await prettier.format(visualforceSource, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const auraFormatted = await prettier.format(auraSource, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const lwcFormatted = await prettier.format(lwcSource, {
      filepath: "/tmp/force-app/main/default/lwc/quotedToken/quotedToken.html",
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(visualforceFormatted).toContain('<apex:outputField value="{!IF(showPanel, \'{!-- token\', \'fallback\')}"/>');
    expect(visualforceFormatted).toContain("<p>");
    expect(visualforceFormatted).toContain("  {!  Account.Name  }");
    expect(visualforceFormatted).toContain("</p>");
    expect(auraFormatted).toContain('<aura:html title="{!IF(v.showPanel, \'{!-- token\', \'fallback\')}"/>');
    expect(auraFormatted).toContain("<p>");
    expect(auraFormatted).toContain("  {!  v.label + ' / ' + v.suffix  }");
    expect(auraFormatted).toContain("</p>");
    expect(lwcFormatted).toContain("<lightning-icon alternative-text={showPanel ? '{!-- token' : 'fallback'}/>");
    expect(lwcFormatted).toContain("<span>");
    expect(lwcFormatted).toContain("  {  row.Label + ' / ' + row.Value  }");
    expect(lwcFormatted).toContain("</span>");
  });

  it("detects self-closing siblings through same-depth comments", async () => {
    const visualforceSource =
      '<apex:page><apex:outputPanel><apex:outputField value="{!Account.Name}"/><!-- keep owner marker --><span>{!  Account.Owner.Name  }</span></apex:outputPanel></apex:page>';
    const auraSource =
      '<aura:component><aura:if isTrue="{!v.show}"><aura:html tag="span"/><!-- keep label marker --><p>{!  v.label + \' / \' + v.suffix  }</p></aura:if></aura:component>';
    const lwcSource =
      "<template><template if:true={hasRows}><lightning-icon icon-name=\"utility:user\"/><!-- keep row marker --><span>{  row.Label + ' / ' + row.Value  }</span></template></template>";

    const visualforceFormatted = await prettier.format(visualforceSource, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const auraFormatted = await prettier.format(auraSource, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const lwcFormatted = await prettier.format(lwcSource, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(visualforceFormatted).toContain("<!-- keep owner marker -->");
    expect(visualforceFormatted).toContain("<span>\n      {!  Account.Owner.Name  }\n    </span>");
    expect(auraFormatted).toContain("<!-- keep label marker -->");
    expect(auraFormatted).toContain("<p>\n      {!  v.label + ' / ' + v.suffix  }\n    </p>");
    expect(lwcFormatted).toContain("<!-- keep row marker -->");
    expect(lwcFormatted).toContain("<span>\n      {  row.Label + ' / ' + row.Value  }\n    </span>");
  });

  it("uses stable multiline attributes for nested expression-heavy visualforce tags", async () => {
    const source =
      '<apex:page><apex:outputPanel rendered="{!  AND( showPanel , NOT(ISBLANK(Account.OwnerId)) )  }" layout="block" styleClass="slds-p-around_medium"><apex:outputText value="{!  IF(showPanel, Account.Owner.Name + \' / \' + Account.CreatedBy.Name, Account.Name)  }" escape="false" styleClass="ownerLine">{!  IF(showPanel, Account.Owner.Name + \' / \' + Account.CreatedBy.Name, Account.Name)  }</apex:outputText></apex:outputPanel></apex:page>';
    const first = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const second = await prettier.format(first, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(first).toContain("<apex:outputText");
    expect(first).toContain('value="{!  IF(showPanel, Account.Owner.Name + \' / \' + Account.CreatedBy.Name, Account.Name)  }"');
    expect(first).toContain('escape="false"');
    expect(first).toContain('styleClass="ownerLine"');
    expect(first).toContain("{!  IF(showPanel, Account.Owner.Name + ' / ' + Account.CreatedBy.Name, Account.Name)  }");
    expect(second).toBe(first);
  });

  it("uses stable multiline attributes for nested expression-heavy aura tags", async () => {
    const source =
      '<aura:component><aura:iteration items="{!  v.itemsByGroup [ v.groupKey ]  }" var="item" indexVar="index"><aura:text value="{!  item.Name + \' / \' + v.suffix  }" class="slds-text-body_small" title="{!  v.titlesById [ item.Id ]  }">{!  item.Name + \' / \' + v.suffix  }</aura:text></aura:iteration></aura:component>';
    const first = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const second = await prettier.format(first, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(first).toContain("<aura:text");
    expect(first).toContain('value="{!  item.Name + \' / \' + v.suffix  }"');
    expect(first).toContain('title="{!  v.titlesById [ item.Id ]  }"');
    expect(first).toContain("{!  item.Name + ' / ' + v.suffix  }");
    expect(second).toBe(first);
  });

  it("uses stable multiline attributes for nested expression-heavy lwc tags", async () => {
    const source =
      '<template><template if:true={  hasRows  } for:each={  rowsByGroup [ groupKey ]  } for:item="row"><button key={  row.Id  } onclick={  handlePick( row.Id )  } onkeydown={  handleKeyDown( row.Id )  } aria-label={  row.Label + \' / \' + row.Value  }>{  row.Label + \' / \' + row.Value  }</button></template></template>';
    const first = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const second = await prettier.format(first, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(first).toContain("<button");
    expect(first).toContain("onclick={  handlePick( row.Id )  }");
    expect(first).toContain("onkeydown={  handleKeyDown( row.Id )  }");
    expect(first).toContain("aria-label={  row.Label + ' / ' + row.Value  }");
    expect(first).toContain("{  row.Label + ' / ' + row.Value  }");
    expect(second).toBe(first);
  });

  it("preserves visualforce expression bytes when quoted strings include braces and angle text", async () => {
    const source =
      '<apex:page><apex:outputText value="{!IF(showPanel, \'<span>{x}</span>\', \'<em>none</em>\')}" title="{!  IF(showPanel, \'x < y\', \'{none}\')  }">{!IF(showPanel, \'<span>{x}</span>\', \'<em>none</em>\')}</apex:outputText></apex:page>';
    const first = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const second = await prettier.format(first, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(first).toContain('value="{!IF(showPanel, \'<span>{x}</span>\', \'<em>none</em>\')}"');
    expect(first).toContain('title="{!  IF(showPanel, \'x < y\', \'{none}\')  }"');
    expect(first).toContain("{!IF(showPanel, '<span>{x}</span>', '<em>none</em>')}");
    expect(second).toBe(first);
  });

  it("preserves aura expression bytes when quoted strings include braces and angle text", async () => {
    const source =
      "<aura:component><aura:text value=\"{!  IF(v.show, '<span>{x}</span>', '<em>none</em>')  }\" title=\"{!v.flag ? 'x < y' : '{none}'}\">{!  IF(v.show, '<span>{x}</span>', '<em>none</em>')  }</aura:text></aura:component>";
    const first = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const second = await prettier.format(first, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(first).toContain("value=\"{!  IF(v.show, '<span>{x}</span>', '<em>none</em>')  }\"");
    expect(first).toContain("title=\"{!v.flag ? 'x < y' : '{none}'}\"");
    expect(first).toContain("{!  IF(v.show, '<span>{x}</span>', '<em>none</em>')  }");
    expect(second).toBe(first);
  });

  it("preserves lwc expression bytes when quoted strings include braces and angle text", async () => {
    const source =
      "<template><template if:true={  showPanel  }><span title={ showPanel ? 'x > y {z}' : '{none} >= y' }>{ showPanel ? 'x > y { z }' : '{ none } >= y' }</span></template></template>";
    const first = await prettier.format(source, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const second = await prettier.format(first, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(first).toContain("if:true={  showPanel  }");
    expect(first).toContain("title={ showPanel ? 'x > y {z}' : '{none} >= y' }");
    expect(first).toContain("{ showPanel ? 'x > y { z }' : '{ none } >= y' }");
    expect(second).toBe(first);
  });

  it("treats braces inside quoted expression strings as literals when deciding inline expansion", async () => {
    const visualforceSource =
      '<apex:page><apex:outputPanel><apex:outputField value="{!Account.Number}"/><span>{!  IF(showPanel, \'left {\', \'right\')  }</span></apex:outputPanel></apex:page>';
    const auraSource =
      '<aura:component><aura:if isTrue="{!v.show}"><aura:html tag="span"/><p>{!  v.show ? \'left {\': \'right\'  }</p></aura:if></aura:component>';
    const lwcSource =
      "<template><template if:true={hasRows}><lightning-icon icon-name=\"utility:user\"/><span>{  showPanel ? 'left {' : 'right'  }</span></template></template>";

    const visualforceFormatted = await prettier.format(visualforceSource, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const auraFormatted = await prettier.format(auraSource, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });
    const lwcFormatted = await prettier.format(lwcSource, {
      parser: "salesforce-markup",
      plugins: [plugin]
    });

    expect(visualforceFormatted).toContain("<span>");
    expect(visualforceFormatted).toContain("  {!  IF(showPanel, 'left {', 'right')  }");
    expect(visualforceFormatted).toContain("</span>");
    expect(auraFormatted).toContain("<p>");
    expect(auraFormatted).toContain("  {!  v.show ? 'left {': 'right'  }");
    expect(auraFormatted).toContain("</p>");
    expect(lwcFormatted).toContain("<span>");
    expect(lwcFormatted).toContain("  {  showPanel ? 'left {' : 'right'  }");
    expect(lwcFormatted).toContain("</span>");
  });
});
