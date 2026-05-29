import { describe, expect, it } from "vitest";
import { highlightSource } from "./highlight.js";

describe("playground syntax highlighting", () => {
  it("keeps doubled Apex quotes inside one string token", () => {
    const html = highlightSource("String name = 'Bob''s Account';", "apex");

    expect(html).toContain('<span class="token system-type">String</span>');
    expect(html).toContain('<span class="token string">\'Bob\'\'s Account\'</span>');
  });

  it("highlights Apex annotations, attributes, SOQL, and custom fields", () => {
    const html = highlightSource(
      "@AuraEnabled(cacheable=true)\npublic static List<Account> load() {\n  return [SELECT Id, Name__c FROM Account WHERE Name__c != null];\n}",
      "apex"
    );

    expect(html).toContain('<span class="token annotation-name">AuraEnabled</span>');
    expect(html).toContain('<span class="token annotation-attr">cacheable</span>');
    expect(html).toContain('<span class="token soql-keyword">SELECT</span>');
    expect(html).toContain('<span class="token sobject-field">Name__c</span>');
    expect(html).toContain('<span class="token sobject-name">Account</span>');
  });

  it("highlights Salesforce markup tags and quoted attributes", () => {
    const html = highlightSource('<aura:component implements="flexipage:availableForAllPageTypes"><lightning:button label="Save"/></aura:component>', "markup");

    expect(html).toContain('<span class="token tag-name">aura:component</span>');
    expect(html).toContain('<span class="token annotation-attr">implements</span>');
    expect(html).toContain('<span class="token string">&quot;flexipage:availableForAllPageTypes&quot;</span>');
    expect(html).toContain('<span class="token tag-name">lightning:button</span>');
  });

  it("highlights Aura and LWC template expressions inside attributes", () => {
    const html = highlightSource('<lightning:button label="{!v.label}" if:true={ready}></lightning:button>', "markup");

    expect(html).toContain('<span class="token bracket">{!</span><span class="token constant">v</span>');
    expect(html).toContain('<span class="token annotation-attr">if:true</span>');
    expect(html).toContain('<span class="token bracket">{</span><span class="token identifier">ready</span><span class="token bracket">}</span>');
  });
});
