import { describe, expect, it } from "vitest";
import {
  metadataCanonicalFamilyFromKnownExtension,
  metadataCanonicalFamilyFromMetadataSource,
  metadataCanonicalFamilyFromPath
} from "./metadata-family-routing.js";

describe("metadata family root-tag mapping", () => {
  it.each([
    ["<ApexClass/>", "apexclasses"],
    ["<ApexComponent/>", "apexcomponents"],
    ["<ApexPage/>", "apexpages"],
    ["<ApexTrigger/>", "apextriggers"],
    ["<AuraDefinitionBundle/>", "auradefinitionbundles"],
    ["<CustomApplication/>", "applications"],
    ["<CaseSettings/>", "settings"],
    ["<Community/>", "communities"],
    ["<CustomPermission/>", "custompermissions"],
    ["<CustomMetadata/>", "custommetadata"],
    ["<CustomObject/>", "objects"],
    ["<CustomObjectTranslation/>", "objecttranslations"],
    ["<CustomLabels/>", "labels"],
    ["<DashboardFolder/>", "dashboards"],
    ["<ReportFolder/>", "reports"],
    ["<ReportType/>", "reporttypes"],
    ["<Flow/>", "flows"],
    ["<FlowDefinition/>", "flowdefinitions"],
    ["<ManagedContentType/>", "managedcontenttypes"],
    ["<Bot/>", "bots"],
    ["<BotVersion/>", "botversions"],
    ["<BotTemplate/>", "bottemplates"],
    ["<PathAssistant/>", "pathassistants"],
    ["<PathAssistantSettings/>", "settings"],
    ["<RemoteSiteSetting/>", "remotesitesettings"],
    ["<SharingRules/>", "sharingrules"],
    ["<StandardValueSet/>", "standardvaluesets"],
    ["<StandardValueSetTranslation/>", "standardvaluesettranslations"],
    ["<GlobalValueSetTranslation/>", "globalvaluesettranslations"],
    ["<ValidationRule/>", "validationrules"],
    ["<WebLink/>", "weblinks"],
    ["<Workflow/>", "workflows"],
    ["<Community/>", "communities"],
    ["<ApexTestSuite/>", "testsuites"],
    ["<FeatureParameterDate/>", "featureparameters"],
    ["<DocumentFolder/>", "documents"],
    ["<Letterhead/>", "letterhead"],
    ["<CustomIndex/>", "customindexes"],
    ["<DataWeaveResource/>", "dataweaveresources"],
    ["<DataSource/>", "datasources"],
    ["<EmailTemplate/>", "emailtemplates"],
    ["<EmailFolder/>", "emailtemplates"],
    ["<CustomField/>", "customfields"],
    ["<CustomFieldTranslation/>", "customfieldtranslations"],
    ["<HomePageComponent/>", "homepagecomponents"],
    ["<Profile/>", "profiles"],
    ["<Audience/>", "audiences"],
    ["<CspTrustedSite/>", "csptrustedsites"],
    ["<Network/>", "networks"],
    ["<NetworkBranding/>", "networkbranding"],
    ["<CustomPageWeblink/>", "weblinks"],
    ["<StaticResource/>", "staticresources"],
    ["<ContentAsset/>", "contentassets"],
    ["<LightningComponentBundle/>", "lightningcomponentbundles"],
    ["<MatchingRule/>", "matchingrules"],
    ["<ExperiencePropertyTypeBundle/>", "experiencepropertytypebundles"],
    ["<Package/>", "packages"],
    ["<Ruleset/>", "rulesets"],
    ["<ExperienceBundle/>", "experiencebundles"]
  ])("maps %s to %s", (source, expectedFamily) => {
    expect(metadataCanonicalFamilyFromMetadataSource(source)).toBe(expectedFamily);
  });

  it("returns null when no mapped root tag is present", () => {
    expect(metadataCanonicalFamilyFromMetadataSource("<UnmappedThing/>")).toBeNull();
  });

  it("maps objectTranslations fieldTranslation sidecars to customfieldtranslations by path", () => {
    expect(
      metadataCanonicalFamilyFromPath(
        "/tmp/force-app/main/default/objecttranslations/account-en_us/name.fieldtranslation-meta.xml"
      )
    ).toBe("customfieldtranslations");
  });

  it("maps mixed-case objectTranslations fieldTranslation sidecars to customfieldtranslations by path", () => {
    expect(
      metadataCanonicalFamilyFromPath(
        "/TMP/Force-App/Main/Default/ObjectTranslations/Account-en_US/Name.fieldTranslation-meta.xml"
      )
    ).toBe("customfieldtranslations");
  });

  it("maps experiences site meta files to experiencebundles by path", () => {
    expect(
      metadataCanonicalFamilyFromPath(
        "/tmp/force-app/main/default/experiences/community_hub1.site-meta.xml"
      )
    ).toBe("experiencebundles");
  });

  it.each([
    ["/tmp/any/shape/foo.cls-meta.xml", "apexclasses"],
    ["/tmp/any/shape/foo.trigger-meta.xml", "apextriggers"],
    ["/tmp/any/shape/foo.page-meta.xml", "apexpages"],
    ["/tmp/any/shape/foo.component-meta.xml", "apexcomponents"],
    ["/tmp/any/shape/foo.permissionset-meta.xml", "permissionsets"],
    ["/tmp/any/shape/foo.profile-meta.xml", "profiles"],
    ["/tmp/any/shape/foo.flow-meta.xml", "flows"],
    ["/tmp/any/shape/foo.tab-meta.xml", "tabs"],
    ["/tmp/any/shape/foo.quickaction-meta.xml", "quickactions"],
    ["/tmp/any/shape/foo.permissionsetgroup-meta.xml", "permissionsetgroups"],
    ["/tmp/any/shape/foo.custompermission-meta.xml", "custompermissions"],
    ["/tmp/any/shape/foo.permissionsetlicense-meta.xml", "permissionsetlicenses"],
    ["/tmp/any/shape/foo.portaldelegablepermissionset-meta.xml", "portaldelegablepermissionsets"],
    ["/tmp/any/shape/foo.namedcredential-meta.xml", "namedcredentials"],
    ["/tmp/any/shape/foo.externalcredential-meta.xml", "externalcredentials"],
    ["/tmp/any/shape/foo.objecttranslation-meta.xml", "objecttranslations"],
    ["/tmp/any/shape/foo.standardvaluesettranslation-meta.xml", "standardvaluesettranslations"],
    ["/tmp/any/shape/foo.globalvaluesettranslation-meta.xml", "globalvaluesettranslations"],
    ["/tmp/any/shape/foo.fieldtranslation-meta.xml", "customfieldtranslations"],
    ["/tmp/any/shape/foo.reporttype-meta.xml", "reporttypes"],
    ["/tmp/any/shape/foo.navigationmenu-meta.xml", "navigationmenus"],
    ["/tmp/any/shape/foo.messagechannel-meta.xml", "messagechannels"],
    ["/tmp/any/shape/foo.labels-meta.xml", "labels"]
  ])("maps sidecar suffix %s to %s by path", (filepath, expectedFamily) => {
    expect(metadataCanonicalFamilyFromPath(filepath)).toBe(expectedFamily);
  });

  it("maps lightningComponentBundles js sidecars to lightningcomponentbundles by path", () => {
    expect(
      metadataCanonicalFamilyFromPath(
        "/tmp/force-app/main/default/lightningComponentBundles/widgetSummary.js-meta.xml"
      )
    ).toBe("lightningcomponentbundles");
  });

  it("maps windows-style mixed-case metadata path without pre-normalization", () => {
    expect(
      metadataCanonicalFamilyFromPath(
        "C:\\TMP\\Force-App\\Main\\Default\\NamedCredentials\\ERP.namedCredential"
      )
    ).toBe("namedcredentials");
  });

  it.each([
    ["/tmp/manifest/package.xml", "packages"],
    ["/tmp/manifest/destructivechanges.xml", "packages"],
    ["/tmp/manifest/delta.xml", "packages"],
    ["/tmp/lib/admin_profile.xml", "packages"],
    ["/tmp/exports/Widget.app", "applications"],
    ["/tmp/exports/Feature.Default.md", "custommetadata"]
  ])("maps package basenames %s to %s by path", (filepath, expectedFamily) => {
    expect(metadataCanonicalFamilyFromPath(filepath)).toBe(expectedFamily);
  });

  it("does not map generic non-manifest xml path as packages", () => {
    expect(metadataCanonicalFamilyFromPath("/tmp/random/nonmetadata/some.xml")).toBeNull();
  });

  it.each([
    ["/tmp/exports/Support_Bot.bot", "bots"],
    ["/tmp/exports/Support_Bot.v7.botVersion", "botversions"],
    ["/tmp/exports/ServiceAssistant.botTemplate", "bottemplates"],
    ["/tmp/exports/News.managedContentType", "managedcontenttypes"],
    ["/tmp/exports/BackOffice.permissionSetGroup", "permissionsetgroups"],
    ["/tmp/exports/Contractor.permissionSetLicense", "permissionsetlicenses"],
    ["/tmp/exports/Partner.portalDelegablePermissionSet", "portaldelegablepermissionsets"]
  ])("maps known extension %s to %s", (filepath, expectedFamily) => {
    expect(metadataCanonicalFamilyFromKnownExtension(filepath)).toBe(expectedFamily);
  });

  it.each([
    "/tmp/exports/Widget.app",
    "/tmp/exports/notes.xml",
    "/tmp/exports/Readme.Setup.md",
    "/tmp/exports/Changelog.2026.md",
    "/tmp/exports/Release.v1.md"
  ])("does not map ambiguous/overbroad extension %s by known extension fallback", (filepath) => {
    expect(metadataCanonicalFamilyFromKnownExtension(filepath)).toBeNull();
  });

  it.each([
    "/tmp/exports/Readme.Setup.md",
    "/tmp/exports/Changelog.2026.md",
    "/tmp/exports/Release.v1.md"
  ])("does not map docs-like exported markdown path %s as custommetadata family", (filepath) => {
    expect(metadataCanonicalFamilyFromPath(filepath)).toBeNull();
  });

  it("keeps special-path mappings for .app-meta.xml and .js-meta.xml", () => {
    expect(metadataCanonicalFamilyFromKnownExtension("/tmp/exports/Widget.app-meta.xml")).toBe("applications");
    expect(metadataCanonicalFamilyFromKnownExtension("/tmp/exports/Widget.js-meta.xml")).toBe("auradefinitionbundles");
  });
});
