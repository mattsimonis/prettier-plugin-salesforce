import { describe, expect, it } from "vitest";
import { METADATA_XML_FAMILIES } from "../metadata-families.js";
import { metadataXmlParser } from "./parser.js";
import { KNOWN_SALESFORCE_METADATA_ROOT_TAGS } from "./salesforce-metadata-root-tags.js";

describe("metadata XML parser", () => {
  it("keeps transforms enabled for metadata suffix paths", () => {
    const parsed = metadataXmlParser.parse("<CustomObject/>", {
      filepath: "/tmp/force-app/main/default/objects/Widget__c/Widget__c.object-meta.xml"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for metadata suffix tmp paths", () => {
    const parsed = metadataXmlParser.parse("<PermissionSet/>", {
      filepath: "/tmp/force-app/main/default/permissionsets/SampleApp.permissionset-meta.xml.tmp"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for metadata object directories", () => {
    const parsed = metadataXmlParser.parse("<CustomObject/>", {
      filepath: "/tmp/package/objects/Widget__c/fields/Score.field-meta.xml"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for labels extension paths", () => {
    const parsed = metadataXmlParser.parse("<CustomLabels/>", {
      filepath: "/tmp/force-app/main/default/labels/CustomLabels.labels"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for Salesforce manifest package.xml paths", () => {
    const parsed = metadataXmlParser.parse("<Package/>", {
      filepath: "/tmp/repo/manifest/package.xml"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for Salesforce unpackaged package.xml paths", () => {
    const parsed = metadataXmlParser.parse("<Package/>", {
      filepath: "/tmp/repo/unpackaged/post/first/package.xml"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("does not force transforms from root-tag fallback for unpackaged non-metadata xml paths", () => {
    const parsed = metadataXmlParser.parse("<Profile/>", {
      filepath: "/tmp/repo/unpackaged/tmp/Profile.xml"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(false);
  });

  it("does not force transforms from root-tag fallback for src non-metadata xml paths", () => {
    const parsed = metadataXmlParser.parse("<Profile/>", {
      filepath: "/tmp/repo/src/tmp/Profile.xml"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(false);
  });

  it("keeps transforms enabled for Salesforce destructiveChanges.xml paths", () => {
    const parsed = metadataXmlParser.parse("<Package/>", {
      filepath: "/tmp/repo/unpackaged/config/delete/destructiveChanges.xml"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for Salesforce src/package.xml paths", () => {
    const parsed = metadataXmlParser.parse("<Package/>", {
      filepath: "/tmp/repo/src/package.xml"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for Salesforce manifest delta.xml package roots", () => {
    const parsed = metadataXmlParser.parse("<Package/>", {
      filepath: "/tmp/repo/manifest/delta.xml"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for Salesforce lib profile package roots", () => {
    const parsed = metadataXmlParser.parse("<Package/>", {
      filepath: "/tmp/repo/lib/admin_profile.xml"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for exported Salesforce profile xml outside source-tree paths", () => {
    const parsed = metadataXmlParser.parse("<Profile/>", {
      filepath: "/tmp/exports/Admin.profile.xml"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for ruleset xml outside source-tree paths", () => {
    const parsed = metadataXmlParser.parse("<ruleset/>", {
      filepath: "/tmp/exports/ruleset.xml"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for every declared exported Salesforce metadata root tag", () => {
    const roots = [...KNOWN_SALESFORCE_METADATA_ROOT_TAGS].sort((a, b) => a.localeCompare(b));
    for (const root of roots) {
      const source = `<${root}/>`;
      const parsed = metadataXmlParser.parse(source, {
        filepath: `/tmp/exports/${root}.xml`
      } as never);
      expect(parsed.applyMetadataTransforms).toBe(true);
    }
  });

  it("keeps transforms enabled for customMetadata directory md file forms", () => {
    const parsed = metadataXmlParser.parse("<CustomMetadata/>", {
      filepath: "/tmp/force-app/main/default/customMetadata/Feature.Default.md"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for layouts directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<Layout/>", {
      filepath: "/tmp/force-app/main/default/layouts/Widget__c-Widget Layout.layout"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for profiles directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<Profile/>", {
      filepath: "/tmp/force-app/main/default/profiles/Admin.profile"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for permissionsets directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<PermissionSet/>", {
      filepath: "/tmp/force-app/main/default/permissionsets/App.permissionset"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for flows directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<Flow/>", {
      filepath: "/tmp/force-app/main/default/flows/Widget_Status.flow"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for translations directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<Translations/>", {
      filepath: "/tmp/force-app/main/default/translations/fr.translation"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for settings directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<AccountSettings/>", {
      filepath: "/tmp/force-app/main/default/settings/Account.settings"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for tabs directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<CustomTab/>", {
      filepath: "/tmp/force-app/main/default/tabs/Widget__c.tab"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for flexipages directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<FlexiPage/>", {
      filepath: "/tmp/force-app/main/default/flexipages/Widget_Record_Page.flexipage"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for applications directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<CustomApplication/>", {
      filepath: "/tmp/force-app/main/default/applications/Console.app"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for quickActions directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<QuickAction/>", {
      filepath: "/tmp/force-app/main/default/quickActions/Widget__c.Assign.quickAction"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for workflows directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<Workflow/>", {
      filepath: "/tmp/force-app/main/default/workflows/Widget__c.workflow"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for sharingRules directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<SharingRules/>", {
      filepath: "/tmp/force-app/main/default/sharingRules/Widget__c.sharingRules"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for standardValueSets directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<StandardValueSet/>", {
      filepath: "/tmp/force-app/main/default/standardValueSets/CasePriority.standardValueSet"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for globalValueSets directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<GlobalValueSet/>", {
      filepath: "/tmp/force-app/main/default/globalValueSets/WidgetStatus.globalValueSet"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for pathAssistants directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<PathAssistant/>", {
      filepath: "/tmp/force-app/main/default/pathAssistants/Widget__c-Widget.pathAssistant"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for remoteSiteSettings directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<RemoteSiteSetting/>", {
      filepath: "/tmp/force-app/main/default/remoteSiteSettings/ERP_Endpoint.remoteSite"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for assignmentRules directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<AssignmentRules/>", {
      filepath: "/tmp/force-app/main/default/assignmentRules/Lead.assignmentRules"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for escalationRules directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<EscalationRules/>", {
      filepath: "/tmp/force-app/main/default/escalationRules/Case.escalationRules"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for matchingRules directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<MatchingRules/>", {
      filepath: "/tmp/force-app/main/default/matchingRules/Contact.matchingRule"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for duplicateRules directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<DuplicateRule/>", {
      filepath: "/tmp/force-app/main/default/duplicateRules/Contact_Dupe.duplicateRule"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for emailServices directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<EmailServicesFunction/>", {
      filepath: "/tmp/force-app/main/default/emailServices/CaseInbound.emailService"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for autoResponseRules directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<AutoResponseRules/>", {
      filepath: "/tmp/force-app/main/default/autoResponseRules/Lead.autoResponseRules"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for namedCredentials directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<NamedCredential/>", {
      filepath: "/tmp/force-app/main/default/namedCredentials/ERP.namedCredential"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for externalCredentials directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<ExternalCredential/>", {
      filepath: "/tmp/force-app/main/default/externalCredentials/ERP.externalCredential"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for dashboards directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<Dashboard/>", {
      filepath: "/tmp/force-app/main/default/dashboards/Sales.dashboard"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for reports directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<Report/>", {
      filepath: "/tmp/force-app/main/default/reports/Sales/Quarterly_Pipeline.report"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for groups directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<Group/>", {
      filepath: "/tmp/force-app/main/default/groups/Support.group"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for queues directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<Queue/>", {
      filepath: "/tmp/force-app/main/default/queues/Support.queue"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for connectedApps directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<ConnectedApp/>", {
      filepath: "/tmp/force-app/main/default/connectedApps/WidgetPortal.connectedApp"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for roles directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<Role/>", {
      filepath: "/tmp/force-app/main/default/roles/Support_Manager.role"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for approvalProcesses directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<ApprovalProcess/>", {
      filepath: "/tmp/force-app/main/default/approvalProcesses/Widget__c.Widget_Approval.approvalProcess"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for homePageLayouts directory legacy file forms", () => {
    const parsed = metadataXmlParser.parse("<HomePageLayout/>", {
      filepath: "/tmp/force-app/main/default/homePageLayouts/Home.homePageLayout"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for every declared metadata family directory and extension", () => {
    for (const family of METADATA_XML_FAMILIES) {
      const parsed = metadataXmlParser.parse("<Metadata/>", {
        filepath: `/tmp/force-app/main/default/${family.directory}/Sample${family.routingExtension}`
      } as never);
      expect(parsed.applyMetadataTransforms).toBe(true);
    }
  });

  it("keeps transforms enabled for every declared metadata directory alias", () => {
    for (const family of METADATA_XML_FAMILIES) {
      for (const alias of family.routingDirectoryAliases) {
        const parsed = metadataXmlParser.parse("<Metadata/>", {
          filepath: `/tmp/force-app/main/default/${alias}/Sample${family.routingExtension}`
        } as never);
        expect(parsed.applyMetadataTransforms).toBe(true);
      }
    }
  });

  it("disables transforms for aura app paths outside applications directories", () => {
    const parsed = metadataXmlParser.parse("<aura:application/>", {
      filepath: "/tmp/force-app/main/default/aura/Widget/Widget.app"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(false);
  });

  it("disables transforms for generic xml paths", () => {
    const parsed = metadataXmlParser.parse("<rss><channel/></rss>", {
      filepath: "/tmp/site/feed.xml"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(false);
  });

  it("disables transforms for metadata-directory xml paths without metadata suffix", () => {
    const parsed = metadataXmlParser.parse("<Flow/>", {
      filepath: "/tmp/force-app/main/default/flows/Widget.flow.xml"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(false);
  });

  it("disables transforms for non-family extensions inside metadata directories", () => {
    const parsed = metadataXmlParser.parse("<Notes/>", {
      filepath: "/tmp/force-app/main/default/objects/Widget__c/README.md"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(false);
  });

  it("disables transforms for settings xml paths without metadata suffix", () => {
    const parsed = metadataXmlParser.parse("<AccountSettings/>", {
      filepath: "/tmp/force-app/main/default/settings/Account.settings.xml"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(false);
  });

  it("disables transforms for generic xml windows paths", () => {
    const parsed = metadataXmlParser.parse("<catalog><book/></catalog>", {
      filepath: "C:\\repo\\xml\\catalog.xml"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(false);
  });

  it("keeps transforms enabled when filepath is unavailable", () => {
    const parsed = metadataXmlParser.parse("<CustomObject/>", {} as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });

  it("keeps transforms enabled for labels extension paths outside metadata directories", () => {
    const parsed = metadataXmlParser.parse("<CustomLabels/>", {
      filepath: "/tmp/exports/CustomLabels.labels"
    } as never);

    expect(parsed.applyMetadataTransforms).toBe(true);
  });
});
