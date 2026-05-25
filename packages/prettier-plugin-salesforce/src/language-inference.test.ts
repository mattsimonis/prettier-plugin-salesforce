import prettier from "prettier";
import { describe, expect, it } from "vitest";
import plugin from "./index.js";

type InferenceCase = {
  expectTrailingNewline?: boolean;
  filepath: string;
  source: string;
  needle?: string;
};

const inferenceCases: InferenceCase[] = [
  { filepath: "/tmp/force-app/main/default/classes/Foo.cls", source: "public class Foo{}\n", needle: "class Foo" },
  { filepath: "/tmp/scripts/run.apex", source: "System.debug('x');\n", needle: "System.debug" },
  { filepath: "/tmp/scripts/deleteRecreateTdtmRecords", source: "System.debug('x');\n", needle: "System.debug('x');" },
  { filepath: "/tmp/scripts/deleteSettings", source: "System.debug('x');\n", needle: "System.debug('x');" },
  { filepath: "/tmp/force-app/main/default/pages/Account.page", source: "<apex:page><apex:outputText value=\"x\"/></apex:page>" },
  { filepath: "/tmp/force-app/main/default/aura/Widget/Widget.cmp", source: "<aura:component></aura:component>" },
  { filepath: "/tmp/force-app/main/default/components/Widget.tokens", source: "<aura:tokens></aura:tokens>" },
  { filepath: "/tmp/force-app/main/default/aura/Widget/Widget.intf", source: "<aura:interface></aura:interface>" },
  { filepath: "/tmp/force-app/main/default/aura/Widget/Widget.tokens", source: "<aura:tokens></aura:tokens>" },
  { filepath: "/tmp/force-app/main/default/lwc/widget/widget.html", source: "<template><div>{value}</div></template>" },
  { filepath: "/tmp/force-app/main/default/lwc/widget/widget.js", source: "export const x=1;\n", needle: "export const x = 1;" },
  { filepath: "/tmp/force-app/main/default/staticresources/ckeditor/ckeditor.mjs", source: "export const x=1;\n", needle: "export const x = 1;" },
  { filepath: "/tmp/force-app/main/default/staticresources/ckeditor/ckeditor.cjs", source: "module.exports={x:1}\n", needle: "module.exports = { x: 1 };" },
  { filepath: "/tmp/force-app/main/default/lwc/widget/widget.jsx", source: "export const View=()=> <div>x</div>;\n", needle: "export const View = () => <div>x</div>;" },
  { filepath: "/tmp/force-app/main/default/lwc/widget/widget.tsx", source: "export const View=(): JSX.Element => <div>x</div>;\n", needle: "export const View = (): JSX.Element => <div>x</div>;" },
  { filepath: "/tmp/force-app/main/default/scripts/theme.less", source: ".a{color:red}\n", needle: "color: red;" },
  { filepath: "/tmp/force-app/main/default/scripts/query.graphql", source: "query Q{account{id name}}\n", needle: "query Q {" },
  { filepath: "/tmp/force-app/main/default/scripts/query.gql", source: "query Q{account{id name}}\n", needle: "query Q {" },
  { filepath: "/tmp/force-app/main/default/scripts/schema.graphqls", source: "type Account{ id: ID! name: String }\n", needle: "type Account {" },
  { filepath: "/tmp/force-app/main/default/scripts/map.geojson", source: "{\"type\":\"FeatureCollection\",\"features\":[]}\n", needle: "\"type\": \"FeatureCollection\"" },
  { filepath: "/tmp/force-app/main/default/scripts/schema.avsc", source: "{\"type\":\"record\",\"name\":\"A\",\"fields\":[]}\n", needle: "\"type\": \"record\"" },
  { filepath: "/tmp/force-app/main/default/scripts/notes.mkd", source: "# Title\n\nText\n", needle: "# Title" },
  { filepath: "/tmp/force-app/main/default/scripts/notes.mdx", source: "# Title\n\n<Widget />\n", needle: "<Widget />" },
  {
    filepath: "/tmp/force-app/main/default/scripts/template.mjml",
    source: "<mjml><mj-body><mj-section><mj-column><mj-text>Hello</mj-text></mj-column></mj-section></mj-body></mjml>",
    needle: "<mjml"
  },
  { filepath: "/tmp/force-app/main/default/scripts/module.mts", source: "export const x:number=1;\n", needle: "export const x: number = 1;" },
  { filepath: "/tmp/force-app/main/default/scripts/module.cts", source: "export const x:number=1;\n", needle: "export const x: number = 1;" },
  {
    filepath: "/tmp/force-app/main/default/scripts/component.vue",
    source: "<template><div>{{msg}}</div></template><script setup lang=\"ts\">const msg='x'</script>",
    needle: "<template>"
  },
  { filepath: "/tmp/force-app/main/default/scripts/config.json5", source: "{foo:'bar', trailing:[1,],}\n", needle: "{ foo: \"bar\", trailing: [1] }" },
  { filepath: "/tmp/force-app/main/default/scripts/config.jsonc", source: "{\n  // note\n  \"foo\": \"bar\",\n}\n", needle: "\"foo\": \"bar\"" },
  { filepath: "/tmp/force-app/main/default/scripts/site.webmanifest", source: "{\"name\":\"Site\",\"icons\":[]}\n", needle: "\"name\": \"Site\"" },
  {
    filepath: "/tmp/force-app/main/default/scripts/template.hbs",
    source: "<div>{{foo}}</div>",
    needle: "{{foo}}",
    expectTrailingNewline: false
  },
  {
    filepath: "/tmp/force-app/main/default/scripts/template.handlebars",
    source: "<div>{{foo}}</div>",
    needle: "{{foo}}",
    expectTrailingNewline: false
  },
  { filepath: "/tmp/force-app/main/default/aura/Widget/WidgetController.js", source: "({run:function(){return 1;}})\n", needle: "run: function ()" },
  { filepath: "C:\\tmp\\force-app\\main\\default\\LWC\\widget\\widget.js", source: "export const x=1;\n", needle: "export const x = 1;" },
  { filepath: "C:\\tmp\\force-app\\main\\default\\LWC\\widget\\widget.jsx", source: "export const View=()=> <div>x</div>;\n", needle: "export const View = () => <div>x</div>;" },
  { filepath: "C:\\tmp\\force-app\\main\\default\\LWC\\widget\\widget.tsx", source: "export const View=(): JSX.Element => <div>x</div>;\n", needle: "export const View = (): JSX.Element => <div>x</div>;" },
  { filepath: "C:\\tmp\\force-app\\main\\default\\AURA\\Widget\\WidgetController.js", source: "({run:function(){return 1;}})\n", needle: "run: function ()" },
  { filepath: "/tmp/force-app/main/default/aura/Widget/Widget.css", source: ".a{color:red}\n", needle: "color: red;" },
  { filepath: "/tmp/force-app/main/default/aura/Widget/Widget.svg", source: "<svg viewBox=\"0 0 1 1\"></svg>" },
  {
    filepath: "/tmp/force-app/main/default/objects/Widget__c/Widget__c.object-meta.xml",
    source: "<CustomObject><label>Widget</label></CustomObject>",
    needle: "<CustomObject>"
  },
  {
    filepath: "/tmp/workspace/.idea/sfdx-workspace.iml",
    source: "<module type=\"JAVA_MODULE\"><component name=\"FacetManager\"/></module>",
    needle: "<module"
  },
  {
    filepath: "/tmp/force-app/main/default/customMetadata/Feature.Default.md",
    source: "<CustomMetadata><label>Default</label></CustomMetadata>",
    needle: "<CustomMetadata>"
  },
  {
    filepath: "/tmp/force-app/main/default/namedCredentials/ERP.namedCredential",
    source: "<NamedCredential><label>ERP</label></NamedCredential>",
    needle: "<NamedCredential>"
  },
  {
    filepath: "/tmp/force-app/main/default/permissionSetGroups/BackOffice.permissionSetGroup",
    source: "<PermissionSetGroup><label>Back Office</label></PermissionSetGroup>",
    needle: "<PermissionSetGroup>"
  },
  {
    filepath: "/tmp/force-app/main/default/customPermissions/Can_Export.customPermission",
    source: "<CustomPermission><label>Can Export</label></CustomPermission>",
    needle: "<CustomPermission>"
  },
  {
    filepath: "/tmp/force-app/main/default/managedContentTypes/Blog.managedContentType",
    source: "<ManagedContentType><fullName>Blog</fullName></ManagedContentType>",
    needle: "<ManagedContentType>"
  },
  {
    filepath: "/tmp/force-app/main/default/bots/Support_Bot.bot",
    source: "<Bot><fullName>Support_Bot</fullName></Bot>",
    needle: "<Bot>"
  },
  {
    filepath: "/tmp/force-app/main/default/botVersions/Support_Bot/v7.botVersion",
    source: "<BotVersion><fullName>Support_Bot.v7</fullName></BotVersion>",
    needle: "<BotVersion>"
  },
  {
    filepath: "/tmp/force-app/main/default/botTemplates/ServiceAssistant.botTemplate",
    source: "<BotTemplate><fullName>ServiceAssistant</fullName></BotTemplate>",
    needle: "<BotTemplate>"
  },
  {
    filepath: "/tmp/force-app/main/default/businessProcesses/Account.Standard.businessProcess",
    source: "<BusinessProcess><fullName>Standard</fullName></BusinessProcess>",
    needle: "<BusinessProcess>"
  },
  {
    filepath: "/tmp/force-app/main/default/flowDefinitions/Widget_Status.flowDefinition",
    source: "<FlowDefinition><activeVersionNumber>1</activeVersionNumber></FlowDefinition>",
    needle: "<FlowDefinition>"
  },
  {
    filepath: "/tmp/force-app/main/default/permissionSetLicenses/Contractor.permissionSetLicense",
    source: "<PermissionSetLicense><label>Contractor</label></PermissionSetLicense>",
    needle: "<PermissionSetLicense>"
  },
  {
    filepath: "/tmp/force-app/main/default/sharingSets/CustomerPortal.sharingSet",
    source: "<SharingSet><fullName>CustomerPortal</fullName></SharingSet>",
    needle: "<SharingSet>"
  },
  {
    filepath: "/tmp/force-app/main/default/authproviders/CorporateSso.authProvider",
    source: "<AuthProvider><friendlyName>Corporate SSO</friendlyName></AuthProvider>",
    needle: "<AuthProvider>"
  },
  {
    filepath: "/tmp/force-app/main/default/dataSources/ERP.dataSource",
    source: "<ExternalDataSource><label>ERP</label></ExternalDataSource>",
    needle: "<ExternalDataSource>"
  },
  {
    filepath: "/tmp/force-app/main/default/cspTrustedSites/Portal.cspTrustedSite",
    source: "<CspTrustedSite><endpointUrl>https://portal.example.com</endpointUrl></CspTrustedSite>",
    needle: "<CspTrustedSite>"
  },
  {
    filepath: "/tmp/force-app/main/default/portalDelegablePermissionSets/Partner.portalDelegablePermissionSet",
    source: "<PortalDelegablePermissionSet><masterLabel>Partner Portal</masterLabel></PortalDelegablePermissionSet>",
    needle: "<PortalDelegablePermissionSet>"
  },
  {
    filepath: "/tmp/force-app/main/default/externalAuthIdentityProviders/CorporateSso.externalAuthIdentityProvider",
    source:
      "<ExternalAuthIdentityProvider><friendlyName>Corporate SSO</friendlyName></ExternalAuthIdentityProvider>",
    needle: "<ExternalAuthIdentityProvider>"
  },
  {
    filepath: "/tmp/force-app/main/default/experiencePropertyTypeBundles/Storefront.experiencePropertyTypeBundle",
    source:
      "<ExperiencePropertyTypeBundle><label>Storefront</label></ExperiencePropertyTypeBundle>",
    needle: "<ExperiencePropertyTypeBundle>"
  },
  {
    filepath: "/tmp/force-app/main/default/topicsForObjects/Case.topicsForObjects",
    source: "<TopicsForObjects><enableTopics>true</enableTopics></TopicsForObjects>",
    needle: "<TopicsForObjects>"
  },
  {
    filepath: "/tmp/force-app/main/default/territories/NorthAmerica.territory",
    source: "<Territory><fullName>NorthAmerica</fullName></Territory>",
    needle: "<Territory>"
  },
  {
    filepath: "/tmp/force-app/main/default/territory2s/Enterprise_US.territory2",
    source: "<Territory2><label>Enterprise US</label></Territory2>",
    needle: "<Territory2>"
  },
  {
    filepath: "/tmp/force-app/main/default/territory2Models/Global.territory2Model",
    source: "<Territory2Model><state>Active</state></Territory2Model>",
    needle: "<Territory2Model>"
  },
  {
    filepath: "/tmp/force-app/main/default/territory2Rules/Account_Default.territory2Rule",
    source: "<Territory2Rule><active>true</active></Territory2Rule>",
    needle: "<Territory2Rule>"
  },
  {
    filepath: "/tmp/force-app/main/default/territory2Types/Enterprise.territory2Type",
    source: "<Territory2Type><label>Enterprise</label></Territory2Type>",
    needle: "<Territory2Type>"
  },
  {
    filepath: "/tmp/force-app/main/default/layouts/Account-Account_Layout.layout",
    source: "<Layout><layoutSections/></Layout>",
    needle: "<Layout>"
  },
  {
    filepath: "/tmp/force-app/main/default/profiles/Admin.profile",
    source: "<Profile><custom>false</custom></Profile>",
    needle: "<Profile>"
  },
  {
    filepath: "/tmp/force-app/main/default/permissionsets/App.permissionset",
    source: "<PermissionSet><label>App</label></PermissionSet>",
    needle: "<PermissionSet>"
  },
  {
    filepath: "/tmp/force-app/main/default/flows/Widget_Status.flow",
    source: "<Flow><label>Widget Status</label></Flow>",
    needle: "<Flow>"
  },
  {
    filepath: "/tmp/force-app/main/default/translations/fr.translation",
    source: "<Translations><customLabels/></Translations>",
    needle: "<Translations>"
  },
  {
    filepath: "/tmp/force-app/main/default/settings/Account.settings",
    source: "<AccountSettings><enableAccountTeams>true</enableAccountTeams></AccountSettings>",
    needle: "<AccountSettings>"
  },
  {
    filepath: "/tmp/force-app/main/default/tabs/Widget__c.tab",
    source: "<CustomTab><motif>Custom67: Handsaw</motif></CustomTab>",
    needle: "<CustomTab>"
  },
  {
    filepath: "/tmp/force-app/main/default/flexipages/Account_Record.flexipage",
    source: "<FlexiPage><masterLabel>Account Record</masterLabel></FlexiPage>",
    needle: "<FlexiPage>"
  },
  {
    filepath: "/tmp/force-app/main/default/applications/Sales.app",
    source: "<CustomApplication><label>Sales</label></CustomApplication>",
    needle: "<CustomApplication>"
  },
  {
    filepath: "/tmp/force-app/main/default/quickactions/New_Case.quickAction",
    source: "<QuickAction><label>New Case</label></QuickAction>",
    needle: "<QuickAction>"
  },
  {
    filepath: "/tmp/force-app/main/default/workflows/Case.workflow",
    source: "<Workflow><alerts/></Workflow>",
    needle: "<Workflow>"
  },
  {
    filepath: "/tmp/force-app/main/default/sharingrules/Account.sharingRules",
    source: "<SharingRules><sharingOwnerRules/></SharingRules>",
    needle: "<SharingRules>"
  },
  {
    filepath: "/tmp/force-app/main/default/restrictionrules/Case_Private.restrictionRule",
    source: "<RestrictionRule><active>true</active></RestrictionRule>",
    needle: "<RestrictionRule>"
  },
  {
    filepath: "/tmp/force-app/main/default/scopingrules/Case_Open.scopingRule",
    source: "<ScopingRule><active>true</active></ScopingRule>",
    needle: "<ScopingRule>"
  },
  {
    filepath: "/tmp/force-app/main/default/standardvaluesets/LeadSource.standardValueSet",
    source: "<StandardValueSet><standardValue><fullName>Web</fullName></standardValue></StandardValueSet>",
    needle: "<StandardValueSet>"
  },
  {
    filepath: "/tmp/force-app/main/default/globalvaluesets/Region.globalValueSet",
    source: "<GlobalValueSet><customValue><fullName>North</fullName></customValue></GlobalValueSet>",
    needle: "<GlobalValueSet>"
  },
  {
    filepath: "/tmp/force-app/main/default/pathassistants/Account.Renewal.pathAssistant",
    source: "<PathAssistant><masterLabel>Renewal</masterLabel></PathAssistant>",
    needle: "<PathAssistant>"
  },
  {
    filepath: "/tmp/force-app/main/default/roles/Account_Manager.role",
    source: "<Role><name>Account Manager</name></Role>",
    needle: "<Role>"
  },
  {
    filepath: "/tmp/force-app/main/default/homepagelayouts/Operations.homePageLayout",
    source: "<HomePageLayout><masterLabel>Operations</masterLabel></HomePageLayout>",
    needle: "<HomePageLayout>"
  },
  {
    filepath: "/tmp/force-app/main/default/compactlayouts/Account.Compact.compactLayout",
    source: "<CompactLayout><fullName>Compact</fullName></CompactLayout>",
    needle: "<CompactLayout>"
  },
  {
    filepath: "/tmp/force-app/main/default/fieldsets/Account.Mobile.fieldSet",
    source: "<FieldSet><fullName>Mobile</fullName></FieldSet>",
    needle: "<FieldSet>"
  },
  {
    filepath: "/tmp/force-app/main/default/flow/Widget_Status.flow",
    source: "<Flow><label>Widget Status</label></Flow>",
    needle: "<Flow>"
  },
  {
    filepath: "/tmp/force-app/main/default/layout/Widget.layout",
    source: "<Layout><layoutSections/></Layout>",
    needle: "<Layout>"
  },
  {
    filepath: "/tmp/force-app/main/default/profile/Admin.profile",
    source: "<Profile><custom>false</custom></Profile>",
    needle: "<Profile>"
  },
  {
    filepath: "/tmp/force-app/main/default/permissionset/App.permissionset",
    source: "<PermissionSet><label>App</label></PermissionSet>",
    needle: "<PermissionSet>"
  },
  {
    filepath: "/tmp/force-app/main/default/translation/fr.translation",
    source: "<Translations><customLabels/></Translations>",
    needle: "<Translations>"
  },
  {
    filepath: "/tmp/force-app/main/default/recordTypes/Account.B2B.recordType",
    source: "<RecordType><fullName>B2B</fullName></RecordType>",
    needle: "<RecordType>"
  },
  {
    filepath: "/tmp/force-app/main/default/approvalProcesses/Account.Standard.approvalProcess",
    source: "<ApprovalProcess><fullName>Standard</fullName></ApprovalProcess>",
    needle: "<ApprovalProcess>"
  },
  {
    filepath: "/tmp/force-app/main/default/assignmentRules/Case.Default.assignmentRules",
    source: "<AssignmentRules><fullName>Default</fullName></AssignmentRules>",
    needle: "<AssignmentRules>"
  },
  {
    filepath: "/tmp/force-app/main/default/escalationRules/Case.Default.escalationRules",
    source: "<EscalationRules><fullName>Default</fullName></EscalationRules>",
    needle: "<EscalationRules>"
  },
  {
    filepath: "/tmp/force-app/main/default/matchingRules/Account.Standard.matchingRule",
    source: "<MatchingRules><fullName>Standard</fullName></MatchingRules>",
    needle: "<MatchingRules>"
  },
  {
    filepath: "/tmp/force-app/main/default/duplicateRules/Account.Standard.duplicateRule",
    source: "<DuplicateRule><fullName>Standard</fullName></DuplicateRule>",
    needle: "<DuplicateRule>"
  },
  {
    filepath: "/tmp/force-app/main/default/emailServices/InboundCases.emailService",
    source: "<EmailServicesFunction><functionName>InboundCases</functionName></EmailServicesFunction>",
    needle: "<EmailServicesFunction>"
  },
  {
    filepath: "/tmp/force-app/main/default/autoResponseRules/Case.Default.autoResponseRules",
    source: "<AutoResponseRules><fullName>Default</fullName></AutoResponseRules>",
    needle: "<AutoResponseRules>"
  },
  {
    filepath: "/tmp/force-app/main/default/externalCredentials/Aws.externalCredential",
    source: "<ExternalCredential><label>AWS</label></ExternalCredential>",
    needle: "<ExternalCredential>"
  },
  {
    filepath: "/tmp/force-app/main/default/dashboards/Sales.dashboard",
    source: "<Dashboard><title>Sales</title></Dashboard>",
    needle: "<Dashboard>"
  },
  {
    filepath: "/tmp/force-app/main/default/reports/Opportunities.report",
    source: "<Report><name>Opportunities</name></Report>",
    needle: "<Report>"
  },
  {
    filepath: "/tmp/force-app/main/default/groups/Support.group",
    source: "<Group><name>Support</name></Group>",
    needle: "<Group>"
  },
  {
    filepath: "/tmp/force-app/main/default/queues/Case.queue",
    source: "<Queue><name>Case</name></Queue>",
    needle: "<Queue>"
  },
  {
    filepath: "/tmp/force-app/main/default/connectedApps/ERP.connectedApp",
    source: "<ConnectedApp><label>ERP</label></ConnectedApp>",
    needle: "<ConnectedApp>"
  },
  {
    filepath: "/tmp/force-app/main/default/validationRules/Account.Require_Website.validationRule",
    source: "<ValidationRule><fullName>Require_Website</fullName></ValidationRule>",
    needle: "<ValidationRule>"
  },
  {
    filepath: "/tmp/force-app/main/default/webLinks/Account.OpenPortal.webLink",
    source: "<WebLink><fullName>OpenPortal</fullName></WebLink>",
    needle: "<WebLink>"
  },
  {
    filepath: "/tmp/force-app/main/default/listViews/Account.Recent_Active.listView",
    source: "<ListView><fullName>Recent_Active</fullName></ListView>",
    needle: "<ListView>"
  },
  {
    filepath: "/tmp/force-app/main/default/milestoneTypes/SLA_Response.milestoneType",
    source: "<MilestoneType><fullName>SLA_Response</fullName></MilestoneType>",
    needle: "<MilestoneType>"
  },
  {
    filepath: "/tmp/force-app/main/default/milestones/Case_First_Response.milestone",
    source: "<Milestone><fullName>Case_First_Response</fullName></Milestone>",
    needle: "<Milestone>"
  },
  {
    filepath: "/tmp/force-app/main/default/sites/Support.site",
    source: "<CustomSite><fullName>Support</fullName></CustomSite>",
    needle: "<CustomSite>"
  },
  {
    filepath: "/tmp/force-app/main/default/networks/Partner.network",
    source: "<Network><fullName>Partner</fullName></Network>",
    needle: "<Network>"
  },
  {
    filepath: "/tmp/force-app/main/default/sharingReasons/Deal_Team.sharingReason",
    source: "<SharingReason><fullName>Deal_Team</fullName></SharingReason>",
    needle: "<SharingReason>"
  },
  {
    filepath: "/tmp/force-app/main/default/samlSsoConfigs/CorpSso.samlSsoConfig",
    source: "<SamlSsoConfig><fullName>CorpSso</fullName></SamlSsoConfig>",
    needle: "<SamlSsoConfig>"
  },
  {
    filepath: "/tmp/force-app/main/default/corsWhitelistOrigins/Portal.corsWhitelistOrigin",
    source: "<CorsWhitelistOrigin><urlPattern>https://example.com</urlPattern></CorsWhitelistOrigin>",
    needle: "<CorsWhitelistOrigin>"
  },
  {
    filepath: "/tmp/force-app/main/default/objects/Invoice__c.object",
    source: "<CustomObject><label>Invoice</label></CustomObject>",
    needle: "<CustomObject>"
  },
  {
    filepath: "/tmp/force-app/main/default/objects/Invoice__c/README.md",
    source: "# Notes\n\ninvoice object notes\n",
    needle: "# Notes"
  },
  {
    filepath: "/tmp/force-app/main/default/objectTranslations/Account-en_US.objectTranslation",
    source: "<CustomObjectTranslation><nameFieldLabel>Account</nameFieldLabel></CustomObjectTranslation>",
    needle: "<CustomObjectTranslation>"
  },
  {
    filepath: "/tmp/force-app/main/default/standardValueSetTranslations/LeadSource-en_US.standardValueSetTranslation",
    source: "<StandardValueSetTranslation><valueTranslation/></StandardValueSetTranslation>",
    needle: "<StandardValueSetTranslation>"
  },
  {
    filepath: "/tmp/force-app/main/default/customMetadata/Finance_Threshold.Finance_Setting.md",
    source: "<CustomMetadata><label>Finance Threshold</label></CustomMetadata>",
    needle: "<CustomMetadata>"
  },
  {
    filepath: "/tmp/force-app/main/default/namedCredentials/ERP.namedcredential",
    source: "<NamedCredential><label>ERP</label></NamedCredential>",
    needle: "<NamedCredential>"
  },
  {
    filepath: "/tmp/force-app/main/default/remoteSiteSettings/ERP.remoteSite",
    source: "<RemoteSiteSetting><url>https://example.com</url></RemoteSiteSetting>",
    needle: "<RemoteSiteSetting>"
  },
  {
    filepath: "/tmp/force-app/main/default/remoteSiteSettings/ERP.remotesite",
    source: "<RemoteSiteSetting><url>https://example.com</url></RemoteSiteSetting>",
    needle: "<RemoteSiteSetting>"
  },
  { filepath: "/tmp/force-app/main/default/labels/CustomLabels.labels", source: "<CustomLabels><labels><fullName>A</fullName></labels></CustomLabels>" },
  { filepath: "/tmp/force-app/main/default/email/welcome.email", source: "Hello there\n", needle: "Hello there" },
  { filepath: "/tmp/force-app/main/default/staticresources/Site.resource", source: "site-body\n", needle: "site-body" },
  { filepath: "/tmp/force-app/main/default/staticresources/styles/theme.less", source: ".a{color:red}\n", needle: "color: red;" },
  { filepath: "/tmp/force-app/main/default/staticresources/schema/query.graphql", source: "query Q{account{id name}}\n", needle: "query Q {" },
  { filepath: "/tmp/force-app/main/default/staticresources/schema/query.gql", source: "query Q{account{id name}}\n", needle: "query Q {" },
  { filepath: "/tmp/force-app/main/default/staticresources/schema/schema.graphqls", source: "type Account{ id: ID! name: String }\n", needle: "type Account {" },
  { filepath: "/tmp/force-app/main/default/staticresources/schema/map.geojson", source: "{\"type\":\"FeatureCollection\",\"features\":[]}\n", needle: "\"type\": \"FeatureCollection\"" },
  { filepath: "/tmp/force-app/main/default/staticresources/schema/schema.avsc", source: "{\"type\":\"record\",\"name\":\"A\",\"fields\":[]}\n", needle: "\"type\": \"record\"" },
  { filepath: "/tmp/force-app/main/default/staticresources/docs/notes.mkd", source: "# Title\n\nText\n", needle: "# Title" },
  { filepath: "/tmp/force-app/main/default/staticresources/docs/notes.mdx", source: "# Title\n\n<Widget />\n", needle: "<Widget />" },
  {
    filepath: "/tmp/force-app/main/default/staticresources/docs/template.mjml",
    source: "<mjml><mj-body><mj-section><mj-column><mj-text>Hello</mj-text></mj-column></mj-section></mj-body></mjml>",
    needle: "<mjml"
  },
  { filepath: "/tmp/force-app/main/default/staticresources/schema/module.mts", source: "export const x:number=1;\n", needle: "export const x: number = 1;" },
  { filepath: "/tmp/force-app/main/default/staticresources/schema/module.cts", source: "export const x:number=1;\n", needle: "export const x: number = 1;" },
  {
    filepath: "/tmp/force-app/main/default/staticresources/ui/component.vue",
    source: "<template><div>{{msg}}</div></template><script setup lang=\"ts\">const msg='x'</script>",
    needle: "<template>"
  },
  {
    filepath: "/tmp/force-app/main/default/staticresources/schema/config.json5",
    source: "{foo:'bar', trailing:[1,],}\n",
    needle: "{ foo: \"bar\", trailing: [1] }"
  },
  {
    filepath: "/tmp/force-app/main/default/staticresources/schema/config.jsonc",
    source: "{\n  // note\n  \"foo\": \"bar\",\n}\n",
    needle: "\"foo\": \"bar\""
  },
  {
    filepath: "/tmp/force-app/main/default/staticresources/schema/site.webmanifest",
    source: "{\"name\":\"Site\",\"icons\":[]}\n",
    needle: "\"name\": \"Site\""
  },
  {
    filepath: "/tmp/force-app/main/default/staticresources/ui/template.hbs",
    source: "<div>{{foo}}</div>",
    needle: "{{foo}}",
    expectTrailingNewline: false
  },
  {
    filepath: "/tmp/force-app/main/default/staticresources/ui/template.handlebars",
    source: "<div>{{foo}}</div>",
    needle: "{{foo}}",
    expectTrailingNewline: false
  },
  { filepath: "/tmp/force-app/main/default/contentassets/Logo.asset", source: "asset-body\n", needle: "asset-body" },
  { filepath: "/tmp/sfdx-project.json", source: "{\"packageDirectories\":[]}", needle: "\"packageDirectories\": []" },
  { filepath: "/tmp/primaryCorpus.yml", source: "name: primaryCorpus\n", needle: "name: primaryCorpus" },
  { filepath: "/tmp/readme.md", source: "# Hello\n\nworld\n", needle: "# Hello" }
];

describe("language inference matrix", () => {
  it.each(inferenceCases)("formats inferred parser for %s", async ({ filepath, source, needle, expectTrailingNewline = true }) => {
    const formatted = await prettier.format(source, { filepath, plugins: [plugin] });
    expect(formatted.length).toBeGreaterThan(0);
    expect(formatted.endsWith("\n")).toBe(expectTrailingNewline);
    if (needle) {
      expect(formatted).toContain(needle);
    }
  });

  it("infers salesforce-router-by-path parser for Salesforce payload basenames and extensions", async () => {
    const cases = [
      "/tmp/force-app/main/default/.forceignore",
      "/tmp/force-app/main/default/email/welcome.email",
      "/tmp/force-app/main/default/staticresources/Site.resource",
      "/tmp/force-app/main/default/contentassets/Logo.asset"
    ];

    for (const filepath of cases) {
      const info = await prettier.getFileInfo(filepath, { plugins: [plugin] });
      expect(info.inferredParser).toBe("salesforce-router-by-path");
    }
  });

  it("keeps generic text-like project files off Salesforce parser inference", async () => {
    for (const filepath of [
      "/tmp/yarn.lock",
      "/tmp/force-app/main/default/CODEOWNERS",
      "/tmp/force-app/main/default/pre-commit",
      "/tmp/force-app/main/default/scripts/reconcile.sql",
      "/tmp/force-app/main/default/marketing/restrictionRule.notes",
      "/tmp/force-app/main/default/config/app.toml"
    ]) {
      const info = await prettier.getFileInfo(filepath, { plugins: [plugin] });
      expect(info.inferredParser).not.toBe("salesforce-router-by-path");
      expect(info.inferredParser).not.toBe("salesforce-metadata-xml");
    }
  });

  it("keeps .py/.php/.robot on unknown inference by default", async () => {
    for (const filepath of [
      "/tmp/force-app/main/default/scripts/run.py",
      "/tmp/force-app/main/default/scripts/posteddata.php",
      "/tmp/robot/tests/lms_rest_api.robot"
    ]) {
      const info = await prettier.getFileInfo(filepath, { plugins: [plugin] });
      expect(info.inferredParser).toBeNull();
    }
  });
});
