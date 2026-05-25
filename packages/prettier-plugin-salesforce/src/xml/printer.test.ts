import prettier from "prettier";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import plugin from "../index.js";
import {
  extractChildSequenceSignature,
  extractElementOrder,
  extractStartTagAttributeSignature,
  extractStartTagAttributeValueSignature,
  extractSiblingBlockSignature,
  formatXmlConservative
} from "./printer.js";

describe("metadata XML printer", () => {
  it("passes through generic xml filepaths with one trailing newline", async () => {
    const source = "<rss><channel><title>News</title></channel></rss>\n\n";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/site/feed.xml",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe("<rss><channel><title>News</title></channel></rss>\n");
  });

  it("passes through generic xml windows filepaths with one trailing newline", async () => {
    const source = "<catalog><book>One</book></catalog>\n\n\n";
    const formatted = await prettier.format(source, {
      filepath: "C:\\repo\\xml\\catalog.xml",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe("<catalog><book>One</book></catalog>\n");
  });

  it("keeps metadata transforms enabled on metadata suffix paths", async () => {
    const source = "<CustomObject><label>Widget</label><sharingModel>ReadWrite</sharingModel></CustomObject>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/objects/Widget__c/Widget__c.object-meta.xml",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<CustomObject>\n  <label>Widget</label>\n  <sharingModel>ReadWrite</sharingModel>\n</CustomObject>\n"
    );
  });

  it("keeps metadata transforms enabled on metadata suffix tmp paths", async () => {
    const source = "<PermissionSet><label>Sample App</label><hasActivationRequired>false</hasActivationRequired></PermissionSet>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/permissionsets/SampleApp.permissionset-meta.xml.tmp",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<PermissionSet>\n  <label>Sample App</label>\n  <hasActivationRequired>false</hasActivationRequired>\n</PermissionSet>\n"
    );
  });

  it("keeps metadata transforms enabled on metadata suffix windows paths", async () => {
    const source = "<CustomObject><label>Widget</label><sharingModel>ReadWrite</sharingModel></CustomObject>";
    const formatted = await prettier.format(source, {
      filepath: "C:\\repo\\force-app\\main\\default\\objects\\Widget__c\\Widget__c.object-meta.xml",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<CustomObject>\n  <label>Widget</label>\n  <sharingModel>ReadWrite</sharingModel>\n</CustomObject>\n"
    );
  });

  it("keeps metadata transforms enabled on labels extension paths", async () => {
    const source = "<CustomLabels><labels><fullName>Welcome</fullName></labels></CustomLabels>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/labels/CustomLabels.labels",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<CustomLabels>\n  <labels>\n    <fullName>Welcome</fullName>\n  </labels>\n</CustomLabels>\n"
    );
  });

  it("keeps metadata transforms enabled on Salesforce manifest package.xml paths", async () => {
    const source = "<Package><types><name>ApexClass</name><members>*</members></types><version>60.0</version></Package>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/repo/manifest/package.xml",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<Package>\n  <types>\n    <name>ApexClass</name>\n    <members>*</members>\n  </types>\n  <version>60.0</version>\n</Package>\n"
    );
  });

  it("keeps metadata transforms enabled on Salesforce unpackaged package.xml paths", async () => {
    const source = "<Package><types><name>CustomObject</name><members>Widget__c</members></types><version>60.0</version></Package>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/repo/unpackaged/post/first/package.xml",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<Package>\n  <types>\n    <name>CustomObject</name>\n    <members>Widget__c</members>\n  </types>\n  <version>60.0</version>\n</Package>\n"
    );
  });

  it("keeps metadata transforms enabled on Salesforce destructiveChanges.xml paths", async () => {
    const source = "<Package><types><name>ApexClass</name><members>ObsoleteClass</members></types><version>60.0</version></Package>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/repo/unpackaged/config/delete/destructiveChanges.xml",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<Package>\n  <types>\n    <name>ApexClass</name>\n    <members>ObsoleteClass</members>\n  </types>\n  <version>60.0</version>\n</Package>\n"
    );
  });

  it("keeps metadata transforms enabled on Salesforce src/package.xml paths", async () => {
    const source = "<Package><types><name>CustomObject</name><members>*</members></types><version>60.0</version></Package>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/repo/src/package.xml",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<Package>\n  <types>\n    <name>CustomObject</name>\n    <members>*</members>\n  </types>\n  <version>60.0</version>\n</Package>\n"
    );
  });

  it("keeps metadata transforms enabled on Salesforce manifest delta.xml package roots", async () => {
    const source = "<Package><types><name>ApexClass</name><members>Widget</members></types><version>60.0</version></Package>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/repo/manifest/delta.xml",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<Package>\n  <types>\n    <name>ApexClass</name>\n    <members>Widget</members>\n  </types>\n  <version>60.0</version>\n</Package>\n"
    );
  });

  it("keeps metadata transforms enabled on Salesforce lib profile package roots", async () => {
    const source = "<Package><types><name>Profile</name><members>Admin</members></types><version>60.0</version></Package>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/repo/lib/admin_profile.xml",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<Package>\n  <types>\n    <name>Profile</name>\n    <members>Admin</members>\n  </types>\n  <version>60.0</version>\n</Package>\n"
    );
  });

  it("keeps metadata transforms enabled on exported Salesforce profile xml outside source-tree paths", async () => {
    const source = "<Profile><custom>false</custom><userLicense>Salesforce</userLicense></Profile>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/exports/Admin.profile.xml",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe("<Profile>\n  <custom>false</custom>\n  <userLicense>Salesforce</userLicense>\n</Profile>\n");
  });

  it("keeps metadata transforms enabled on ruleset xml outside source-tree paths", async () => {
    const source = "<ruleset name=\"Salesforce\"><description>Rules</description><rule ref=\"category/apex/bestpractices.xml/AvoidGlobalModifier\"/></ruleset>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/exports/ruleset.xml",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<ruleset name=\"Salesforce\">\n  <description>Rules</description>\n  <rule ref=\"category/apex/bestpractices.xml/AvoidGlobalModifier\"/>\n</ruleset>\n"
    );
  });

  it("keeps labels entry order by default", async () => {
    const source = [
      "<CustomLabels>",
      "  <labels><fullName>Zeta</fullName><value>Z</value></labels>",
      "  <labels><fullName>Alpha</fullName><value>A</value></labels>",
      "</CustomLabels>"
    ].join("");
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/labels/CustomLabels.labels",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted.indexOf("<fullName>Zeta</fullName>")).toBeLessThan(formatted.indexOf("<fullName>Alpha</fullName>"));
  });

  it("sorts labels entries by fullName when option is enabled", async () => {
    const source = [
      "<CustomLabels>",
      "  <labels><fullName>Zeta</fullName><value>Z</value></labels>",
      "  <labels><fullName>Alpha</fullName><value>A</value></labels>",
      "</CustomLabels>"
    ].join("");
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/labels/CustomLabels.labels",
      parser: "salesforce-metadata-xml",
      plugins: [plugin],
      salesforceSortLabelEntriesByFullName: true
    });

    expect(formatted.indexOf("<fullName>Alpha</fullName>")).toBeLessThan(formatted.indexOf("<fullName>Zeta</fullName>"));
  });

  it("sorts labels entries by fullName when preferred option key is enabled", async () => {
    const source = [
      "<CustomLabels>",
      "  <labels><fullName>Zeta</fullName><value>Z</value></labels>",
      "  <labels><fullName>Alpha</fullName><value>A</value></labels>",
      "</CustomLabels>"
    ].join("");
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/labels/CustomLabels.labels",
      parser: "salesforce-metadata-xml",
      plugins: [plugin],
      salesforceSortLabelsByFullName: true
    });

    expect(formatted.indexOf("<fullName>Alpha</fullName>")).toBeLessThan(formatted.indexOf("<fullName>Zeta</fullName>"));
  });

  it("keeps leading comments attached to labels when sorting by fullName", async () => {
    const source = [
      "<CustomLabels>",
      "  <!-- Zeta help text -->",
      "  <labels><fullName>Zeta</fullName><value>Z</value></labels>",
      "  <!-- Alpha help text -->",
      "  <labels><fullName>Alpha</fullName><value>A</value></labels>",
      "</CustomLabels>"
    ].join("");
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/labels/CustomLabels.labels",
      parser: "salesforce-metadata-xml",
      plugins: [plugin],
      salesforceSortLabelsByFullName: true
    });

    expect(formatted.indexOf("<!-- Alpha help text -->")).toBeLessThan(formatted.indexOf("<fullName>Alpha</fullName>"));
    expect(formatted.indexOf("<!-- Zeta help text -->")).toBeLessThan(formatted.indexOf("<fullName>Zeta</fullName>"));
    expect(formatted.indexOf("<!-- Alpha help text -->")).toBeLessThan(formatted.indexOf("<!-- Zeta help text -->"));
  });

  it("sorts labels entries for labels-meta.xml sidecar paths", async () => {
    const source = [
      "<CustomLabels>",
      "  <labels><fullName>Zeta</fullName><value>Z</value></labels>",
      "  <labels><fullName>Alpha</fullName><value>A</value></labels>",
      "</CustomLabels>"
    ].join("");
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/labels/CustomLabels.labels-meta.xml",
      parser: "salesforce-metadata-xml",
      plugins: [plugin],
      salesforceSortLabelEntriesByFullName: true
    });

    expect(formatted.indexOf("<fullName>Alpha</fullName>")).toBeLessThan(formatted.indexOf("<fullName>Zeta</fullName>"));
  });

  it("sorts labels entries for labels-meta.xml.tmp sidecar paths", async () => {
    const source = [
      "<CustomLabels>",
      "  <labels><fullName>Zeta</fullName><value>Z</value></labels>",
      "  <labels><fullName>Alpha</fullName><value>A</value></labels>",
      "</CustomLabels>"
    ].join("");
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/labels/CustomLabels.labels-meta.xml.tmp",
      parser: "salesforce-metadata-xml",
      plugins: [plugin],
      salesforceSortLabelEntriesByFullName: true
    });

    expect(formatted.indexOf("<fullName>Alpha</fullName>")).toBeLessThan(formatted.indexOf("<fullName>Zeta</fullName>"));
  });

  it("sorts mixed-case label fullName values alphabetically by fullName", async () => {
    const source = [
      "<CustomLabels>",
      "  <labels><fullName>zeta</fullName><value>Z</value></labels>",
      "  <labels><fullName>Alpha</fullName><value>A1</value></labels>",
      "  <labels><fullName>alpha</fullName><value>A2</value></labels>",
      "  <labels><fullName>Beta</fullName><value>B</value></labels>",
      "</CustomLabels>"
    ].join("");
    const firstPass = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/labels/CustomLabels.labels",
      parser: "salesforce-metadata-xml",
      plugins: [plugin],
      salesforceSortLabelEntriesByFullName: true
    });
    const secondPass = await prettier.format(firstPass, {
      filepath: "/tmp/force-app/main/default/labels/CustomLabels.labels",
      parser: "salesforce-metadata-xml",
      plugins: [plugin],
      salesforceSortLabelEntriesByFullName: true
    });

    const alphaUpperIndex = firstPass.indexOf("<fullName>Alpha</fullName>");
    const alphaLowerIndex = firstPass.indexOf("<fullName>alpha</fullName>");
    const betaIndex = firstPass.indexOf("<fullName>Beta</fullName>");
    expect(Math.min(alphaUpperIndex, alphaLowerIndex)).toBeLessThan(betaIndex);
    expect(Math.max(alphaUpperIndex, alphaLowerIndex)).toBeLessThan(betaIndex);
    expect(firstPass.indexOf("<fullName>Beta</fullName>")).toBeLessThan(firstPass.indexOf("<fullName>zeta</fullName>"));
    expect(secondPass).toBe(firstPass);
  });

  it("sorts accented and mixed-case label fullName values deterministically", async () => {
    const source = [
      "<CustomLabels>",
      "  <labels><fullName>Éclair</fullName><value>E1</value></labels>",
      "  <labels><fullName>eclair</fullName><value>E2</value></labels>",
      "  <labels><fullName>Zebra</fullName><value>Z</value></labels>",
      "  <labels><fullName>alpha</fullName><value>A</value></labels>",
      "</CustomLabels>"
    ].join("");
    const firstPass = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/labels/CustomLabels.labels",
      parser: "salesforce-metadata-xml",
      plugins: [plugin],
      salesforceSortLabelEntriesByFullName: true
    });
    const secondPass = await prettier.format(firstPass, {
      filepath: "/tmp/force-app/main/default/labels/CustomLabels.labels",
      parser: "salesforce-metadata-xml",
      plugins: [plugin],
      salesforceSortLabelEntriesByFullName: true
    });

    expect(firstPass.indexOf("<fullName>alpha</fullName>")).toBeLessThan(firstPass.indexOf("<fullName>eclair</fullName>"));
    expect(firstPass.indexOf("<fullName>eclair</fullName>")).toBeLessThan(firstPass.indexOf("<fullName>Éclair</fullName>"));
    expect(firstPass.indexOf("<fullName>Éclair</fullName>")).toBeLessThan(firstPass.indexOf("<fullName>Zebra</fullName>"));
    expect(secondPass).toBe(firstPass);
  });

  it("sorts labels entries by fullName without filepath when root is CustomLabels", async () => {
    const source = [
      "<CustomLabels>",
      "  <labels><fullName>Zeta</fullName><value>Z</value></labels>",
      "  <labels><fullName>Alpha</fullName><value>A</value></labels>",
      "</CustomLabels>"
    ].join("");
    const formatted = await prettier.format(source, {
      parser: "salesforce-metadata-xml",
      plugins: [plugin],
      salesforceSortLabelEntriesByFullName: true
    });

    expect(formatted.indexOf("<fullName>Alpha</fullName>")).toBeLessThan(formatted.indexOf("<fullName>Zeta</fullName>"));
  });

  it("sorts namespace-prefixed label entries by fullName when option is enabled", async () => {
    const source = [
      "<md:CustomLabels xmlns:md=\"http://soap.sforce.com/2006/04/metadata\">",
      "  <md:labels><md:fullName>Zeta</md:fullName><md:value>Z</md:value></md:labels>",
      "  <md:labels><md:fullName>Alpha</md:fullName><md:value>A</md:value></md:labels>",
      "</md:CustomLabels>"
    ].join("");
    const formatted = await prettier.format(source, {
      parser: "salesforce-metadata-xml",
      plugins: [plugin],
      salesforceSortLabelEntriesByFullName: true
    });

    expect(formatted.indexOf("<md:fullName>Alpha</md:fullName>")).toBeLessThan(
      formatted.indexOf("<md:fullName>Zeta</md:fullName>")
    );
  });

  it("sorts labels entries when labels/fullName tags carry attributes", async () => {
    const source = [
      "<CustomLabels>",
      "  <labels xmlns=\"http://soap.sforce.com/2006/04/metadata\" data-role=\"global\"><fullName xml:lang=\"en\">Zeta</fullName><value>Z</value></labels>",
      "  <labels xmlns=\"http://soap.sforce.com/2006/04/metadata\" data-role=\"global\"><fullName xml:lang=\"en\">Alpha</fullName><value>A</value></labels>",
      "</CustomLabels>"
    ].join("");
    const formatted = await prettier.format(source, {
      parser: "salesforce-metadata-xml",
      plugins: [plugin],
      salesforceSortLabelEntriesByFullName: true
    });

    expect(formatted.indexOf("<fullName xml:lang=\"en\">Alpha</fullName>")).toBeLessThan(
      formatted.indexOf("<fullName xml:lang=\"en\">Zeta</fullName>")
    );
  });

  it("sorts labels entries with mixed prefixed and unprefixed child tags under CustomLabels", async () => {
    const source = [
      "<md:CustomLabels xmlns:md=\"http://soap.sforce.com/2006/04/metadata\">",
      "  <labels><fullName>Zeta</fullName><value>Z</value></labels>",
      "  <md:labels><md:fullName>Alpha</md:fullName><md:value>A</md:value></md:labels>",
      "</md:CustomLabels>"
    ].join("");
    const formatted = await prettier.format(source, {
      parser: "salesforce-metadata-xml",
      plugins: [plugin],
      salesforceSortLabelEntriesByFullName: true
    });

    expect(formatted.indexOf("<md:fullName>Alpha</md:fullName>")).toBeLessThan(
      formatted.indexOf("<fullName>Zeta</fullName>")
    );
  });

  it("keeps label order when any labels block has no fullName", async () => {
    const source = [
      "<CustomLabels>",
      "  <labels><fullName>Zeta</fullName><value>Z</value></labels>",
      "  <labels><value>No name</value></labels>",
      "</CustomLabels>"
    ].join("");
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/labels/CustomLabels.labels",
      parser: "salesforce-metadata-xml",
      plugins: [plugin],
      salesforceSortLabelEntriesByFullName: true
    });

    expect(formatted.indexOf("<fullName>Zeta</fullName>")).toBeLessThan(formatted.indexOf("<value>No name</value>"));
  });

  it("keeps missing-fullName label order stable across repeated passes", async () => {
    const source = [
      "<CustomLabels>",
      "  <labels><fullName>Zeta</fullName><value>Z</value></labels>",
      "  <labels><value>No name 1</value></labels>",
      "  <labels><fullName>Alpha</fullName><value>A</value></labels>",
      "  <labels><value>No name 2</value></labels>",
      "</CustomLabels>"
    ].join("");
    const firstPass = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/labels/CustomLabels.labels",
      parser: "salesforce-metadata-xml",
      plugins: [plugin],
      salesforceSortLabelEntriesByFullName: true
    });
    const secondPass = await prettier.format(firstPass, {
      filepath: "/tmp/force-app/main/default/labels/CustomLabels.labels",
      parser: "salesforce-metadata-xml",
      plugins: [plugin],
      salesforceSortLabelEntriesByFullName: true
    });

    expect(firstPass.indexOf("<fullName>Zeta</fullName>")).toBeLessThan(firstPass.indexOf("<value>No name 1</value>"));
    expect(firstPass.indexOf("<value>No name 1</value>")).toBeLessThan(firstPass.indexOf("<fullName>Alpha</fullName>"));
    expect(firstPass.indexOf("<fullName>Alpha</fullName>")).toBeLessThan(firstPass.indexOf("<value>No name 2</value>"));
    expect(secondPass).toBe(firstPass);
  });

  it("keeps metadata transforms enabled on layouts directory legacy file forms", async () => {
    const source = "<Layout><layoutSections><label>Information</label></layoutSections></Layout>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/layouts/Widget__c-Widget Layout.layout",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<Layout>\n  <layoutSections>\n    <label>Information</label>\n  </layoutSections>\n</Layout>\n"
    );
  });

  it("keeps metadata transforms enabled on profiles directory legacy file forms", async () => {
    const source = "<Profile><custom>true</custom><userLicense>Salesforce</userLicense></Profile>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/profiles/Admin.profile",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe("<Profile>\n  <custom>true</custom>\n  <userLicense>Salesforce</userLicense>\n</Profile>\n");
  });

  it("keeps metadata transforms enabled on permissionsets directory legacy file forms", async () => {
    const source = "<PermissionSet><label>App</label><hasActivationRequired>false</hasActivationRequired></PermissionSet>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/permissionsets/App.permissionset",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<PermissionSet>\n  <label>App</label>\n  <hasActivationRequired>false</hasActivationRequired>\n</PermissionSet>\n"
    );
  });

  it("keeps metadata transforms enabled on flows directory legacy file forms", async () => {
    const source = "<Flow><label>Widget Status</label><status>Active</status><processType>Flow</processType></Flow>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/flows/Widget_Status.flow",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<Flow>\n  <label>Widget Status</label>\n  <status>Active</status>\n  <processType>Flow</processType>\n</Flow>\n"
    );
  });

  it("keeps metadata transforms enabled on translations directory legacy file forms", async () => {
    const source = "<Translations><customLabels><label>Bonjour</label><name>Greeting</name></customLabels></Translations>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/translations/fr.translation",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<Translations>\n  <customLabels>\n    <label>Bonjour</label>\n    <name>Greeting</name>\n  </customLabels>\n</Translations>\n"
    );
  });

  it("keeps metadata transforms enabled on settings directory legacy file forms", async () => {
    const source =
      "<AccountSettings><enableAccountTeams>true</enableAccountTeams><enableRelateContactToMultipleAccounts>false</enableRelateContactToMultipleAccounts></AccountSettings>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/settings/Account.settings",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<AccountSettings>\n  <enableAccountTeams>true</enableAccountTeams>\n  <enableRelateContactToMultipleAccounts>false</enableRelateContactToMultipleAccounts>\n</AccountSettings>\n"
    );
  });

  it("keeps metadata transforms enabled on tabs directory legacy file forms", async () => {
    const source = "<CustomTab><description>Widget workbench</description><label>Widget</label><motif>Custom1: Heart</motif></CustomTab>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/tabs/Widget__c.tab",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<CustomTab>\n  <description>Widget workbench</description>\n  <label>Widget</label>\n  <motif>Custom1: Heart</motif>\n</CustomTab>\n"
    );
  });

  it("keeps metadata transforms enabled on flexipages directory legacy file forms", async () => {
    const source =
      "<FlexiPage><description>Widget record workspace</description><masterLabel>Widget Record Page</masterLabel><sobjectType>Widget__c</sobjectType><type>RecordPage</type></FlexiPage>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/flexipages/Widget_Record_Page.flexipage",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<FlexiPage>\n  <description>Widget record workspace</description>\n  <masterLabel>Widget Record Page</masterLabel>\n  <sobjectType>Widget__c</sobjectType>\n  <type>RecordPage</type>\n</FlexiPage>\n"
    );
  });

  it("keeps metadata transforms enabled on applications directory legacy file forms", async () => {
    const source = "<CustomApplication><description>Console app</description><label>Console</label></CustomApplication>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/applications/Console.app",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<CustomApplication>\n  <description>Console app</description>\n  <label>Console</label>\n</CustomApplication>\n"
    );
  });

  it("keeps metadata transforms enabled on quickActions directory legacy file forms", async () => {
    const source = "<QuickAction><label>Assign</label><type>Update</type></QuickAction>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/quickActions/Widget__c.Assign.quickAction",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe("<QuickAction>\n  <label>Assign</label>\n  <type>Update</type>\n</QuickAction>\n");
  });

  it("keeps metadata transforms enabled on workflows directory legacy file forms", async () => {
    const source = "<Workflow><alerts><fullName>Notify_Owner</fullName></alerts></Workflow>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/workflows/Widget__c.workflow",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<Workflow>\n  <alerts>\n    <fullName>Notify_Owner</fullName>\n  </alerts>\n</Workflow>\n"
    );
  });

  it("keeps metadata transforms enabled on sharingRules directory legacy file forms", async () => {
    const source =
      "<SharingRules><sharingCriteriaRules><fullName>Share_With_Support</fullName></sharingCriteriaRules></SharingRules>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/sharingRules/Widget__c.sharingRules",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<SharingRules>\n  <sharingCriteriaRules>\n    <fullName>Share_With_Support</fullName>\n  </sharingCriteriaRules>\n</SharingRules>\n"
    );
  });

  it("keeps metadata transforms enabled on standardValueSets directory legacy file forms", async () => {
    const source =
      "<StandardValueSet><groupingStringEnum>High</groupingStringEnum><sorted>false</sorted></StandardValueSet>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/standardValueSets/CasePriority.standardValueSet",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<StandardValueSet>\n  <groupingStringEnum>High</groupingStringEnum>\n  <sorted>false</sorted>\n</StandardValueSet>\n"
    );
  });

  it("keeps metadata transforms enabled on globalValueSets directory legacy file forms", async () => {
    const source =
      "<GlobalValueSet><customValue><fullName>Open</fullName><default>true</default></customValue></GlobalValueSet>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/globalValueSets/WidgetStatus.globalValueSet",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<GlobalValueSet>\n  <customValue>\n    <fullName>Open</fullName>\n    <default>true</default>\n  </customValue>\n</GlobalValueSet>\n"
    );
  });

  it("keeps metadata transforms enabled on pathAssistants directory legacy file forms", async () => {
    const source =
      "<PathAssistant><active>true</active><entityName>Widget__c</entityName><pathAssistantSteps><fieldNames>Status__c</fieldNames></pathAssistantSteps></PathAssistant>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/pathAssistants/Widget__c-Widget.pathAssistant",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<PathAssistant>\n  <active>true</active>\n  <entityName>Widget__c</entityName>\n  <pathAssistantSteps>\n    <fieldNames>Status__c</fieldNames>\n  </pathAssistantSteps>\n</PathAssistant>\n"
    );
  });

  it("keeps metadata transforms enabled on remoteSiteSettings directory legacy file forms", async () => {
    const source = "<RemoteSiteSetting><disableProtocolSecurity>false</disableProtocolSecurity><isActive>true</isActive></RemoteSiteSetting>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/remoteSiteSettings/ERP_Endpoint.remoteSite",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<RemoteSiteSetting>\n  <disableProtocolSecurity>false</disableProtocolSecurity>\n  <isActive>true</isActive>\n</RemoteSiteSetting>\n"
    );
  });

  it("keeps metadata transforms enabled on assignmentRules directory legacy file forms", async () => {
    const source =
      "<AssignmentRules><assignmentRule><fullName>Lead_Default</fullName><active>true</active></assignmentRule></AssignmentRules>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/assignmentRules/Lead.assignmentRules",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<AssignmentRules>\n  <assignmentRule>\n    <fullName>Lead_Default</fullName>\n    <active>true</active>\n  </assignmentRule>\n</AssignmentRules>\n"
    );
  });

  it("keeps metadata transforms enabled on escalationRules directory legacy file forms", async () => {
    const source =
      "<EscalationRules><escalationRule><fullName>Case_Default</fullName><active>true</active></escalationRule></EscalationRules>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/escalationRules/Case.escalationRules",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<EscalationRules>\n  <escalationRule>\n    <fullName>Case_Default</fullName>\n    <active>true</active>\n  </escalationRule>\n</EscalationRules>\n"
    );
  });

  it("keeps metadata transforms enabled on matchingRules directory legacy file forms", async () => {
    const source =
      "<MatchingRules><matchingRules><fullName>Contact_Match</fullName><booleanFilter>1</booleanFilter></matchingRules></MatchingRules>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/matchingRules/Contact.matchingRule",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<MatchingRules>\n  <matchingRules>\n    <fullName>Contact_Match</fullName>\n    <booleanFilter>1</booleanFilter>\n  </matchingRules>\n</MatchingRules>\n"
    );
  });

  it("keeps metadata transforms enabled on duplicateRules directory legacy file forms", async () => {
    const source =
      "<DuplicateRule><actionOnInsert>Allow</actionOnInsert><duplicateRuleFilter><booleanFilter>1</booleanFilter></duplicateRuleFilter></DuplicateRule>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/duplicateRules/Contact_Dupe.duplicateRule",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<DuplicateRule>\n  <actionOnInsert>Allow</actionOnInsert>\n  <duplicateRuleFilter>\n    <booleanFilter>1</booleanFilter>\n  </duplicateRuleFilter>\n</DuplicateRule>\n"
    );
  });

  it("keeps metadata transforms enabled on emailServices directory legacy file forms", async () => {
    const source =
      "<EmailServicesFunction><authorizedSenders>support@example.com</authorizedSenders><functionName>CaseInbound</functionName></EmailServicesFunction>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/emailServices/CaseInbound.emailService",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<EmailServicesFunction>\n  <authorizedSenders>support@example.com</authorizedSenders>\n  <functionName>CaseInbound</functionName>\n</EmailServicesFunction>\n"
    );
  });

  it("keeps metadata transforms enabled on autoResponseRules directory legacy file forms", async () => {
    const source =
      "<AutoResponseRules><autoResponseRule><fullName>Lead_Default</fullName><active>true</active></autoResponseRule></AutoResponseRules>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/autoResponseRules/Lead.autoResponseRules",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<AutoResponseRules>\n  <autoResponseRule>\n    <fullName>Lead_Default</fullName>\n    <active>true</active>\n  </autoResponseRule>\n</AutoResponseRules>\n"
    );
  });

  it("keeps metadata transforms enabled on namedCredentials directory legacy file forms", async () => {
    const source = "<NamedCredential><label>ERP</label><endpoint>https://erp.example.com</endpoint></NamedCredential>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/namedCredentials/ERP.namedCredential",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<NamedCredential>\n  <label>ERP</label>\n  <endpoint>https://erp.example.com</endpoint>\n</NamedCredential>\n"
    );
  });

  it("keeps metadata transforms enabled on externalCredentials directory legacy file forms", async () => {
    const source =
      "<ExternalCredential><label>ERP</label><authenticationProtocol>Oauth2</authenticationProtocol></ExternalCredential>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/externalCredentials/ERP.externalCredential",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<ExternalCredential>\n  <label>ERP</label>\n  <authenticationProtocol>Oauth2</authenticationProtocol>\n</ExternalCredential>\n"
    );
  });

  it("keeps metadata transforms enabled on dashboards directory legacy file forms", async () => {
    const source = "<Dashboard><title>Sales KPI</title><runningUser>sales@example.com</runningUser></Dashboard>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/dashboards/Sales.dashboard",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<Dashboard>\n  <title>Sales KPI</title>\n  <runningUser>sales@example.com</runningUser>\n</Dashboard>\n"
    );
  });

  it("keeps metadata transforms enabled on reports directory legacy file forms", async () => {
    const source =
      "<Report><name>Quarterly Pipeline</name><reportType>Opportunities</reportType><format>Summary</format></Report>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/reports/Sales/Quarterly_Pipeline.report",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<Report>\n  <name>Quarterly Pipeline</name>\n  <reportType>Opportunities</reportType>\n  <format>Summary</format>\n</Report>\n"
    );
  });

  it("keeps metadata transforms enabled on groups directory legacy file forms", async () => {
    const source = "<Group><doesIncludeBosses>false</doesIncludeBosses><name>Support</name></Group>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/groups/Support.group",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<Group>\n  <doesIncludeBosses>false</doesIncludeBosses>\n  <name>Support</name>\n</Group>\n"
    );
  });

  it("keeps metadata transforms enabled on queues directory legacy file forms", async () => {
    const source = "<Queue><doesSendEmailToMembers>true</doesSendEmailToMembers><name>Support</name></Queue>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/queues/Support.queue",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<Queue>\n  <doesSendEmailToMembers>true</doesSendEmailToMembers>\n  <name>Support</name>\n</Queue>\n"
    );
  });

  it("keeps metadata transforms enabled on connectedApps directory legacy file forms", async () => {
    const source = "<ConnectedApp><label>Widget Portal</label><contactEmail>owner@example.com</contactEmail></ConnectedApp>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/connectedApps/WidgetPortal.connectedApp",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<ConnectedApp>\n  <label>Widget Portal</label>\n  <contactEmail>owner@example.com</contactEmail>\n</ConnectedApp>\n"
    );
  });

  it("keeps metadata transforms enabled on roles directory legacy file forms", async () => {
    const source = "<Role><name>Support Manager</name><opportunityAccessForAccountOwner>Read</opportunityAccessForAccountOwner></Role>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/roles/Support_Manager.role",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<Role>\n  <name>Support Manager</name>\n  <opportunityAccessForAccountOwner>Read</opportunityAccessForAccountOwner>\n</Role>\n"
    );
  });

  it("keeps metadata transforms enabled on approvalProcesses directory legacy file forms", async () => {
    const source = "<ApprovalProcess><active>true</active><label>Widget Approval</label></ApprovalProcess>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/approvalProcesses/Widget__c.Widget_Approval.approvalProcess",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<ApprovalProcess>\n  <active>true</active>\n  <label>Widget Approval</label>\n</ApprovalProcess>\n"
    );
  });

  it("keeps metadata transforms enabled on homePageLayouts directory legacy file forms", async () => {
    const source = "<HomePageLayout><narrowComponents><type>TaskList</type></narrowComponents></HomePageLayout>";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/homePageLayouts/Home.homePageLayout",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<HomePageLayout>\n  <narrowComponents>\n    <type>TaskList</type>\n  </narrowComponents>\n</HomePageLayout>\n"
    );
  });

  it("keeps metadata family paths format-safe on newly added file forms", async () => {
    const matrix = [
      {
        filepath: "/tmp/force-app/main/default/businessProcesses/Account.Standard.businessProcess",
        source: "<BusinessProcess><isActive>true</isActive><values><fullName>New</fullName></values></BusinessProcess>",
        expectedRootTag: "BusinessProcess"
      },
      {
        filepath: "/tmp/force-app/main/default/recordTypes/Account.B2B.recordType",
        source: "<RecordType><active>true</active><label>B2B</label></RecordType>",
        expectedRootTag: "RecordType"
      },
      {
        filepath: "/tmp/force-app/main/default/validationRules/Account.Require_Website.validationRule",
        source: "<ValidationRule><active>true</active><errorConditionFormula>ISBLANK(Website)</errorConditionFormula></ValidationRule>",
        expectedRootTag: "ValidationRule"
      },
      {
        filepath: "/tmp/force-app/main/default/webLinks/Account.OpenPortal.webLink",
        source: "<WebLink><availability>online</availability><masterLabel>Open Portal</masterLabel></WebLink>",
        expectedRootTag: "WebLink"
      },
      {
        filepath: "/tmp/force-app/main/default/listViews/Account.Recent_Active.listView",
        source: "<ListView><label>Recent Active</label><sharedTo><allInternalUsers>true</allInternalUsers></sharedTo></ListView>",
        expectedRootTag: "ListView"
      },
      {
        filepath: "/tmp/force-app/main/default/milestoneTypes/SLA_Response.milestoneType",
        source: "<MilestoneType><description>Response SLA</description><recurrenceType>noRecurrence</recurrenceType></MilestoneType>",
        expectedRootTag: "MilestoneType"
      },
      {
        filepath: "/tmp/force-app/main/default/milestones/Case_First_Response.milestone",
        source: "<Milestone><description>First response</description><startDateField>Name</startDateField></Milestone>",
        expectedRootTag: "Milestone"
      },
      {
        filepath: "/tmp/force-app/main/default/sites/Support.site",
        source: "<CustomSite><active>true</active><label>Support</label></CustomSite>",
        expectedRootTag: "CustomSite"
      },
      {
        filepath: "/tmp/force-app/main/default/networks/Partner.network",
        source: "<Network><description>Partner community</description><status>Live</status></Network>",
        expectedRootTag: "Network"
      },
      {
        filepath: "/tmp/force-app/main/default/sharingReasons/Deal_Team.sharingReason",
        source: "<SharingReason><label>Deal Team</label><name>Deal_Team</name></SharingReason>",
        expectedRootTag: "SharingReason"
      },
      {
        filepath: "/tmp/force-app/main/default/samlSsoConfigs/CorpSso.samlSsoConfig",
        source: "<SamlSsoConfig><issuer>urn:corp</issuer><version>2.0</version></SamlSsoConfig>",
        expectedRootTag: "SamlSsoConfig"
      },
      {
        filepath: "/tmp/force-app/main/default/corsWhitelistOrigins/Portal.corsWhitelistOrigin",
        source: "<CorsWhitelistOrigin><isActive>true</isActive><urlPattern>https://portal.example.com</urlPattern></CorsWhitelistOrigin>",
        expectedRootTag: "CorsWhitelistOrigin"
      },
      {
        filepath: "/tmp/force-app/main/default/customMetadata/Finance_Threshold.Finance_Setting.md",
        source: "<CustomMetadata><label>Finance Threshold</label><protected>false</protected></CustomMetadata>",
        expectedRootTag: "CustomMetadata"
      },
      {
        filepath: "/tmp/force-app/main/default/objects/Invoice__c.object",
        source: "<CustomObject><label>Invoice</label><pluralLabel>Invoices</pluralLabel></CustomObject>",
        expectedRootTag: "CustomObject"
      }
    ] as const;

    for (const testCase of matrix) {
      const formatted = await prettier.format(testCase.source, {
        filepath: testCase.filepath,
        parser: "salesforce-metadata-xml",
        plugins: [plugin]
      });
      const secondPass = await prettier.format(formatted, {
        filepath: testCase.filepath,
        parser: "salesforce-metadata-xml",
        plugins: [plugin]
      });

      expect(formatted.endsWith("\n")).toBe(true);
      expect(formatted).toContain(`<${testCase.expectedRootTag}>`);
      expect(formatted).toContain(`</${testCase.expectedRootTag}>`);
      expect(secondPass).toBe(formatted);
    }
  });

  it("passes through app extension paths outside applications directories", async () => {
    const source = "<aura:application><aura:text value=\"Hi\"/></aura:application>\n\n";
    const formatted = await prettier.format(source, {
      filepath: "/tmp/force-app/main/default/aura/Widget/Widget.app",
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe("<aura:application><aura:text value=\"Hi\"/></aura:application>\n");
  });

  it("breaks adjacent tags without reordering elements", async () => {
    const source = "<CustomObject><label>Widget</label><sharingModel>ReadWrite</sharingModel></CustomObject>";
    const formatted = await prettier.format(source, {
      parser: "salesforce-metadata-xml",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "<CustomObject>\n  <label>Widget</label>\n  <sharingModel>ReadWrite</sharingModel>\n</CustomObject>\n"
    );
  });

  it("formats twice to the same bytes and preserves element order", () => {
    const source = "<A><B>one</B><C><D>two</D></C></A>";
    const once = formatXmlConservative(source);
    const twice = formatXmlConservative(once);

    expect(twice).toEqual(once);
    expect(extractElementOrder(once)).toEqual(extractElementOrder(source));
  });

  it("indents nested metadata blocks", () => {
    const source =
      '<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata"><nameField><label>Widget Name</label><type>Text</type></nameField></CustomObject>';
    const formatted = formatXmlConservative(source);

    expect(formatted).toBe(
      '<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">\n  <nameField>\n    <label>Widget Name</label>\n    <type>Text</type>\n  </nameField>\n</CustomObject>\n'
    );
  });

  it("preserves declaration and comment ordering", () => {
    const source = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<!-- top comment -->",
      "<CustomObject>",
      "  <label>Widget</label>",
      "</CustomObject>"
    ].join("\n");

    const formatted = formatXmlConservative(source);

    expect(formatted).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        "<!-- top comment -->",
        "<CustomObject>",
        "  <label>Widget</label>",
        "</CustomObject>",
        ""
      ].join("\n")
    );
  });

  it("preserves comments between sibling metadata elements", () => {
    const source =
      "<CustomObject><label>Widget</label><!-- keep order --><sharingModel>ReadWrite</sharingModel></CustomObject>";
    const formatted = formatXmlConservative(source);

    expect(formatted).toBe(
      "<CustomObject>\n  <label>Widget</label>\n  <!-- keep order -->\n  <sharingModel>ReadWrite</sharingModel>\n</CustomObject>\n"
    );
    expect(extractElementOrder(formatted)).toEqual(["CustomObject", "label", "sharingModel"]);
  });

  it("is idempotent with declaration, comments, and nested blocks", () => {
    const source = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<!-- metadata -->",
      "<Layout>",
      "<layoutSections><label>Main</label></layoutSections>",
      "<!-- footer -->",
      "</Layout>"
    ].join("");
    const once = formatXmlConservative(source);
    const twice = formatXmlConservative(once);

    expect(twice).toBe(once);
  });

  it("keeps metadata family node order for permission set xml", () => {
    const source = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<!-- bundle-level comment -->",
      '<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">',
      "<applicationVisibilities>",
      "<application>Widget_App</application>",
      "<default>false</default>",
      "<visible>true</visible>",
      "</applicationVisibilities>",
      "<!-- keep this between blocks -->",
      "<label>App</label>",
      "</PermissionSet>"
    ].join("");
    const formatted = formatXmlConservative(source);

    expect(formatted).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        "<!-- bundle-level comment -->",
        '<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">',
        "  <applicationVisibilities>",
        "    <application>Widget_App</application>",
        "    <default>false</default>",
        "    <visible>true</visible>",
        "  </applicationVisibilities>",
        "  <!-- keep this between blocks -->",
        "  <label>App</label>",
        "</PermissionSet>",
        ""
      ].join("\n")
    );
  });

  it("keeps permissionset sibling block order with declaration and comments", () => {
    const source = readFixture("permissionset/SiblingRisk.permissionset-meta.xml");
    const formatted = formatXmlConservative(source);

    expect(extractElementOrder(formatted)).toEqual(extractElementOrder(source));
    expect(formatted.indexOf("<applicationVisibilities>")).toBeLessThan(formatted.indexOf("<classAccesses>"));
    expect(formatted.indexOf("<classAccesses>")).toBeLessThan(formatted.indexOf("<fieldPermissions>"));
    expect(formatted.indexOf("<!-- app visibility before class access -->")).toBeGreaterThan(
      formatted.indexOf("<applicationVisibilities>")
    );
    expect(formatted.indexOf("<!-- class access before field perms -->")).toBeGreaterThan(
      formatted.indexOf("<classAccesses>")
    );
    expect(formatted.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
  });

  it("falls back to original text when xml tokenization would be unsafe", () => {
    const source = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">',
      "<fullName>Widget__c.Score__c</fullName>",
      "<formula>IF(Score__c < 10, 'Low', 'High')</formula>",
      "</CustomField>"
    ].join("");
    const formatted = formatXmlConservative(source);

    expect(formatted).toBe(`${source}\n`);
  });

  it("falls back on encoded-content matrix constructs across metadata families", () => {
    for (const variant of metadataFallbackMatrixVariants) {
      const source = readFixture(variant);
      assertFallbackMatrixStable(source);
    }
  });

  it("keeps profile metadata sequence stable and retains declaration/comment", () => {
    const source = readFixture("profile/Admin.profile-meta.xml");
    const withEnvelope = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<!-- profile guard -->",
      source.trim()
    ].join("\n");
    const formatted = formatXmlConservative(withEnvelope);

    expect(formatted.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<!-- profile guard -->\n')).toBe(true);
    expect(extractElementOrder(formatted)).toEqual(extractElementOrder(withEnvelope));
  });

  it("keeps profile sibling block order with declaration and comments", () => {
    const source = readFixture("profile/SiblingRisk.profile-meta.xml");
    const formatted = formatXmlConservative(source);

    expect(extractElementOrder(formatted)).toEqual(extractElementOrder(source));
    expect(formatted.indexOf("<applicationVisibilities>")).toBeLessThan(formatted.indexOf("<fieldPermissions>"));
    expect(formatted.indexOf("<fieldPermissions>")).toBeLessThan(formatted.indexOf("<tabVisibilities>"));
    expect(formatted.indexOf("<!-- apps before field perms -->")).toBeGreaterThan(
      formatted.indexOf("<applicationVisibilities>")
    );
    expect(formatted.indexOf("<!-- field perms before tabs -->")).toBeGreaterThan(formatted.indexOf("<fieldPermissions>"));
    expect(formatted.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
  });

  it("keeps layout metadata sequence stable and retains declaration/comment", () => {
    const source = readFixture("layout/Widget__c-Widget Layout.layout-meta.xml");
    const withEnvelope = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<!-- layout guard -->",
      source.trim()
    ].join("\n");
    const formatted = formatXmlConservative(withEnvelope);

    expect(formatted.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<!-- layout guard -->\n')).toBe(true);
    expect(extractElementOrder(formatted)).toEqual(extractElementOrder(withEnvelope));
  });

  it("keeps layout sibling block order with declaration and comments", () => {
    const source = readFixture("layout/SiblingRisk.layout-meta.xml");
    const formatted = formatXmlConservative(source);

    expect(extractElementOrder(formatted)).toEqual(extractElementOrder(source));
    expect(formatted.indexOf("<layoutSections>")).toBeLessThan(formatted.indexOf("<relatedLists>"));
    expect(formatted.indexOf("<relatedLists>")).toBeLessThan(formatted.indexOf("<showEmailCheckbox>"));
    expect(formatted.indexOf("<!-- sections before lists -->")).toBeGreaterThan(formatted.indexOf("<layoutSections>"));
    expect(formatted.indexOf("<!-- lists before settings -->")).toBeGreaterThan(formatted.indexOf("<relatedLists>"));
    expect(formatted.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
  });

  it("keeps flow metadata sequence stable and retains declaration/comment", () => {
    const source = readFixture("flow/Widget_Status.with-comments.flow-meta.xml");
    const formatted = formatXmlConservative(source);

    expect(formatted.includes('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(formatted.includes("<!-- keep process shape -->")).toBe(true);
    expect(formatted.includes("<!-- status remains after process type -->")).toBe(true);
    expect(extractElementOrder(formatted)).toEqual(extractElementOrder(source));
  });

  it("keeps object metadata sequence stable and retains declaration/comment", () => {
    const source = readFixture("basic/Widget__c.object-meta.xml");
    const withEnvelope = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<!-- object guard -->",
      source.trim()
    ].join("\n");
    const formatted = formatXmlConservative(withEnvelope);

    expect(formatted.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<!-- object guard -->\n')).toBe(true);
    expect(extractElementOrder(formatted)).toEqual(extractElementOrder(withEnvelope));
  });

  it("keeps mixed sibling block shape stable across metadata families", () => {
    for (const variant of metadataMixedShapeVariants) {
      const source = readFixture(variant.path);
      const formatted = formatXmlConservative(source);

      expect(extractElementOrder(formatted)).toEqual(extractElementOrder(source));
      expect(formatted.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
      expect(formatted.includes(variant.commentNeedle)).toBe(true);

      for (let index = 0; index < variant.anchors.length - 1; index += 1) {
        expect(formatted.indexOf(variant.anchors[index])).toBeLessThan(formatted.indexOf(variant.anchors[index + 1]));
      }
    }
  });

  it("keeps sibling signature stable across additional mixed metadata variants", () => {
    const variants = [
      "permissionset/SiblingRiskMixed2.permissionset-meta.xml",
      "profile/SiblingRiskMixed2.profile-meta.xml",
      "layout/SiblingRiskMixed2.layout-meta.xml",
      "flow/SiblingRiskMixed2.flow-meta.xml",
      "basic/SiblingRiskMixed2.object-meta.xml",
      "labels/SiblingRiskMixed.labels",
      "translation/SiblingRiskMixed.translation-meta.xml"
    ];

    for (const variant of variants) {
      const source = readFixture(variant);
      const formatted = formatXmlConservative(source);
      expect(extractSiblingBlockSignature(formatted)).toEqual(extractSiblingBlockSignature(source));
      expect(extractElementOrder(formatted)).toEqual(extractElementOrder(source));
      expect(formatted.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
      expect(formatted.includes("<!--")).toBe(true);
    }
  });

  it("keeps sibling signature and element order stable for corpus-shaped metadata fragments", () => {
    const variants = [
      "permissionset/SiblingRiskCorpus.permissionset-meta.xml",
      "profile/SiblingRiskCorpus.profile-meta.xml",
      "layout/SiblingRiskCorpus.layout-meta.xml",
      "flow/SiblingRiskCorpus.flow-meta.xml",
      "basic/SiblingRiskCorpus.object-meta.xml"
    ];

    for (const variant of variants) {
      const source = readFixture(variant);
      const formatted = formatXmlConservative(source);
      expect(extractSiblingBlockSignature(formatted)).toEqual(extractSiblingBlockSignature(source));
      expect(extractElementOrder(formatted)).toEqual(extractElementOrder(source));
      expect(formatted.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
      expect(formatted.includes("<!--")).toBe(true);
    }
  });

  it("keeps sibling signatures stable for corpus-like mixed blocks with comments and self-closing nodes", () => {
    const variants = [
      {
        path: "permissionset/SiblingRiskCorpus3.permissionset-meta.xml",
        anchors: ["<applicationVisibilities>", "<classAccesses/>", "<fieldPermissions>", "<tabSettings/>"]
      },
      {
        path: "profile/SiblingRiskCorpus3.profile-meta.xml",
        anchors: ["<applicationVisibilities>", "<fieldPermissions/>", "<recordTypeVisibilities>", "<tabVisibilities/>"]
      },
      {
        path: "layout/SiblingRiskCorpus3.layout-meta.xml",
        anchors: ["<layoutSections>", "<miniLayout/>", "<relatedLists>", "<showHighlightsPanel>"]
      },
      {
        path: "flow/SiblingRiskCorpus3.flow-meta.xml",
        anchors: ["<apiVersion>", "<assignments/>", "<processType>", "<status/>"]
      },
      {
        path: "basic/SiblingRiskCorpus3.object-meta.xml",
        anchors: ["<nameField>", "<businessProcesses/>", "<deploymentStatus>", "<sharingModel/>"]
      }
    ];

    for (const variant of variants) {
      const source = readFixture(variant.path);
      const formatted = formatXmlConservative(source);
      expect(extractSiblingBlockSignature(formatted)).toEqual(extractSiblingBlockSignature(source));
      expect(extractElementOrder(formatted)).toEqual(extractElementOrder(source));
      expect(formatted.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
      expect(formatted.includes("<!--")).toBe(true);

      for (let index = 0; index < variant.anchors.length - 1; index += 1) {
        expect(formatted.indexOf(variant.anchors[index])).toBeLessThan(formatted.indexOf(variant.anchors[index + 1]));
      }
    }
  });

  it("keeps child-sequence signature stable across metadata families", () => {
    const variants = [
      "permissionset/SiblingRiskCorpus4.permissionset-meta.xml",
      "profile/SiblingRiskCorpus4.profile-meta.xml",
      "layout/SiblingRiskCorpus4.layout-meta.xml",
      "flow/SiblingRiskCorpus4.flow-meta.xml",
      "basic/SiblingRiskCorpus4.object-meta.xml",
      "labels/SiblingRiskCorpus4.labels",
      "translation/SiblingRiskCorpus4.translation-meta.xml"
    ];

    for (const variant of variants) {
      const source = readFixture(variant);
      const formatted = formatXmlConservative(source);
      expect(extractChildSequenceSignature(formatted)).toEqual(extractChildSequenceSignature(source));
      expect(extractSiblingBlockSignature(formatted)).toEqual(extractSiblingBlockSignature(source));
      expect(extractElementOrder(formatted)).toEqual(extractElementOrder(source));
      expect(formatted.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
      expect(formatted.includes("<!--")).toBe(true);
    }
  });

  it("extracts start-tag attribute signatures with stable depth and parent context", () => {
    const source = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Root xmlns="urn:meta" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
      '  <Field fullName="Widget__c.Score__c" trackHistory="true">',
      "    <label>Score</label>",
      "  </Field>",
      "</Root>"
    ].join("\n");

    expect(extractStartTagAttributeSignature(source)).toEqual([
      "0|#root|Root|xmlns,xmlns:xsi",
      "1|Root|Field|fullName,trackHistory",
      "2|Field|label|"
    ]);
  });

  it("extracts start-tag attribute value signatures with raw quoted values", () => {
    const source = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Root xmlns="urn:meta" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
      '  <Field fullName="Widget__c.Score__c" trackHistory="true">',
      "    <label>Score</label>",
      "  </Field>",
      "</Root>"
    ].join("\n");

    expect(extractStartTagAttributeValueSignature(source)).toEqual([
      '0|#root|Root|xmlns="urn:meta",xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
      '1|Root|Field|fullName="Widget__c.Score__c",trackHistory="true"',
      "2|Field|label|"
    ]);
  });

  it("keeps start-tag attribute signatures stable across broad corpus-like metadata variants", () => {
    const variants = [
      "permissionset/SiblingRiskMixed.permissionset-meta.xml",
      "profile/SiblingRiskMixed.profile-meta.xml",
      "layout/SiblingRiskMixed.layout-meta.xml",
      "flow/SiblingRiskMixed.flow-meta.xml",
      "basic/SiblingRiskMixed.object-meta.xml",
      "labels/SiblingRiskMixed.labels",
      "translation/SiblingRiskMixed.translation-meta.xml",
      "permissionset/SiblingRiskMixed2.permissionset-meta.xml",
      "profile/SiblingRiskMixed2.profile-meta.xml",
      "layout/SiblingRiskMixed2.layout-meta.xml",
      "flow/SiblingRiskMixed2.flow-meta.xml",
      "basic/SiblingRiskMixed2.object-meta.xml",
      "permissionset/SiblingRiskCorpus3.permissionset-meta.xml",
      "profile/SiblingRiskCorpus3.profile-meta.xml",
      "layout/SiblingRiskCorpus3.layout-meta.xml",
      "flow/SiblingRiskCorpus3.flow-meta.xml",
      "basic/SiblingRiskCorpus3.object-meta.xml",
      "permissionset/SiblingRiskCorpus4.permissionset-meta.xml",
      "profile/SiblingRiskCorpus4.profile-meta.xml",
      "layout/SiblingRiskCorpus4.layout-meta.xml",
      "flow/SiblingRiskCorpus4.flow-meta.xml",
      "basic/SiblingRiskCorpus4.object-meta.xml",
      "labels/SiblingRiskCorpus4.labels",
      "translation/SiblingRiskCorpus4.translation-meta.xml"
    ];

    for (const variant of variants) {
      const source = readFixture(variant);
      const formatted = formatXmlConservative(source);
      expect(extractStartTagAttributeSignature(formatted)).toEqual(extractStartTagAttributeSignature(source));
      expect(extractStartTagAttributeValueSignature(formatted)).toEqual(extractStartTagAttributeValueSignature(source));
      expect(extractChildSequenceSignature(formatted)).toEqual(extractChildSequenceSignature(source));
      expect(extractSiblingBlockSignature(formatted)).toEqual(extractSiblingBlockSignature(source));
      expect(extractElementOrder(formatted)).toEqual(extractElementOrder(source));
      expect(formatted.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
    }
  });
});

const metadataFallbackMatrixVariants = [
  "permissionset/SiblingRiskEscapedAngles.permissionset-meta.xml",
  "permissionset/SiblingRiskEncodedMatrix.permissionset-meta.xml",
  "permissionset/SiblingRiskEncodedCdataMatrix.permissionset-meta.xml",
  "profile/SiblingRiskEscapedAngles.profile-meta.xml",
  "profile/SiblingRiskEncodedMatrix.profile-meta.xml",
  "profile/SiblingRiskEncodedCdataMatrix.profile-meta.xml",
  "layout/SiblingRiskEscapedAngles.layout-meta.xml",
  "layout/SiblingRiskEncodedMatrix.layout-meta.xml",
  "layout/SiblingRiskEncodedCdataMatrix.layout-meta.xml",
  "flow/SiblingRiskEscapedAngles.flow-meta.xml",
  "flow/SiblingRiskEncodedMatrix.flow-meta.xml",
  "flow/SiblingRiskEncodedCdataMatrix.flow-meta.xml",
  "basic/SiblingRiskEscapedAngles.object-meta.xml",
  "basic/SiblingRiskEncodedMatrix.object-meta.xml",
  "basic/SiblingRiskEncodedCdataMatrix.object-meta.xml",
  "labels/SiblingRiskEscapedAngles.labels",
  "labels/SiblingRiskEncodedMatrix.labels",
  "labels/SiblingRiskEncodedCdataMatrix.labels",
  "translation/SiblingRiskEscapedAngles.translation-meta.xml",
  "translation/SiblingRiskEncodedMatrix.translation-meta.xml",
  "translation/SiblingRiskEncodedCdataMatrix.translation-meta.xml"
] as const;

const metadataMixedShapeVariants = [
  {
    path: "permissionset/SiblingRiskMixed.permissionset-meta.xml",
    anchors: ["<applicationVisibilities>", "<classAccesses/>", "<fieldPermissions>"],
    commentNeedle: "<!-- keep this marker with app block -->"
  },
  {
    path: "profile/SiblingRiskMixed.profile-meta.xml",
    anchors: ["<applicationVisibilities>", "<fieldPermissions/>", "<tabVisibilities>"],
    commentNeedle: "<!-- marker between app and fields -->"
  },
  {
    path: "layout/SiblingRiskMixed.layout-meta.xml",
    anchors: ["<layoutSections>", "<relatedLists/>", "<showEmailCheckbox>"],
    commentNeedle: "<!-- marker between sections and lists -->"
  },
  {
    path: "flow/SiblingRiskMixed.flow-meta.xml",
    anchors: ["<apiVersion>", "<interviewLabel/>", "<processType>", "<status>"],
    commentNeedle: "<!-- marker between process type and status -->"
  },
  {
    path: "basic/SiblingRiskMixed.object-meta.xml",
    anchors: ["<deploymentStatus>", "<description/>", "<sharingModel>"],
    commentNeedle: "<!-- marker between deployment and sharing -->"
  },
  {
    path: "labels/SiblingRiskMixed.labels",
    anchors: ["<fullName>", "<language>", "<shortDescription/>", "<value>"],
    commentNeedle: "<!-- marker between language and value -->"
  },
  {
    path: "translation/SiblingRiskMixed.translation-meta.xml",
    anchors: ["<name>", "<label/>", "<fullName>", "<nameFieldLabel>"],
    commentNeedle: "<!-- marker between name and label -->"
  }
] as const;

function readFixture(relativePath: string): string {
  return readFileSync(path.resolve(import.meta.dirname, "../../tests/metadata", relativePath), "utf8");
}

function assertFallbackMatrixStable(source: string): void {
  const formatted = formatXmlConservative(source);
  const secondPass = formatXmlConservative(formatted);
  expect(formatted).toBe(`${source.trim()}\n`);
  expect(secondPass).toBe(formatted);
  expect(extractElementOrder(formatted)).toEqual(extractElementOrder(source));
  expect(extractSiblingBlockSignature(formatted)).toEqual(extractSiblingBlockSignature(source));
  expect(extractChildSequenceSignature(formatted)).toEqual(extractChildSequenceSignature(source));
  expect(extractStartTagAttributeSignature(formatted)).toEqual(extractStartTagAttributeSignature(source));
  expect(extractStartTagAttributeValueSignature(formatted)).toEqual(extractStartTagAttributeValueSignature(source));
}
