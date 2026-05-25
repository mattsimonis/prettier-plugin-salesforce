type MetadataFamily = {
  directory: string;
  routingExtension: string;
  languageExtensions?: string[];
  routingDirectoryAliases?: string[];
  routingBasenames?: string[];
};

const METADATA_FAMILIES: MetadataFamily[] = [
  { directory: "custommetadata", routingExtension: ".md" },
  { directory: "objects", routingExtension: ".object" },
  { directory: "layouts", routingExtension: ".layout", routingDirectoryAliases: ["layout"] },
  { directory: "profiles", routingExtension: ".profile", routingDirectoryAliases: ["profile"] },
  { directory: "permissionsets", routingExtension: ".permissionset", routingDirectoryAliases: ["permissionset"] },
  {
    directory: "permissionsetlicenses",
    routingExtension: ".permissionsetlicense",
    languageExtensions: [".permissionSetLicense"],
    routingDirectoryAliases: ["permissionsetlicense", "permissionSetLicenses"]
  },
  {
    directory: "portaldelegablepermissionsets",
    routingExtension: ".portaldelegablepermissionset",
    languageExtensions: [".portalDelegablePermissionSet"],
    routingDirectoryAliases: ["portaldelegablepermissionset", "portalDelegablePermissionSets"]
  },
  { directory: "permissionsetgroups", routingExtension: ".permissionsetgroup", languageExtensions: [".permissionSetGroup"] },
  { directory: "custompermissions", routingExtension: ".custompermission", languageExtensions: [".customPermission"] },
  {
    directory: "managedcontenttypes",
    routingExtension: ".managedcontenttype",
    languageExtensions: [".managedContentType"],
    routingDirectoryAliases: ["managedcontenttype", "managedContentTypes"]
  },
  { directory: "bots", routingExtension: ".bot", routingDirectoryAliases: ["bot"] },
  {
    directory: "botversions",
    routingExtension: ".botversion",
    languageExtensions: [".botVersion"],
    routingDirectoryAliases: ["botversion", "botVersions"]
  },
  {
    directory: "bottemplates",
    routingExtension: ".bottemplate",
    languageExtensions: [".botTemplate"],
    routingDirectoryAliases: ["bottemplate", "botTemplates"]
  },
  { directory: "flows", routingExtension: ".flow", routingDirectoryAliases: ["flow"] },
  {
    directory: "flowdefinitions",
    routingExtension: ".flowdefinition",
    languageExtensions: [".flowDefinition"],
    routingDirectoryAliases: ["flowdefinition", "flowDefinitions"]
  },
  { directory: "labels", routingExtension: ".labels" },
  { directory: "translations", routingExtension: ".translation", routingDirectoryAliases: ["translation"] },
  { directory: "standardvaluesettranslations", routingExtension: ".standardvaluesettranslation", languageExtensions: [".standardValueSetTranslation"] },
  { directory: "globalvaluesettranslations", routingExtension: ".globalvaluesettranslation", languageExtensions: [".globalValueSetTranslation"] },
  { directory: "objecttranslations", routingExtension: ".objecttranslation", languageExtensions: [".objectTranslation"] },
  { directory: "settings", routingExtension: ".settings" },
  { directory: "tabs", routingExtension: ".tab" },
  { directory: "flexipages", routingExtension: ".flexipage" },
  { directory: "applications", routingExtension: ".app" },
  { directory: "navigationmenus", routingExtension: ".navigationmenu", languageExtensions: [".navigationMenu"] },
  { directory: "messagechannels", routingExtension: ".messagechannel", languageExtensions: [".messageChannel"] },
  { directory: "cachepartitions", routingExtension: ".cachepartition", languageExtensions: [".cachePartition"] },
  { directory: "notificationtypes", routingExtension: ".notiftype" },
  { directory: "audiences", routingExtension: ".audience", routingDirectoryAliases: ["audience"] },
  { directory: "prompts", routingExtension: ".prompt" },
  {
    directory: "featureparameters",
    routingExtension: ".featureparameterboolean",
    languageExtensions: [".featureparameterdate", ".featureparameterinteger"]
  },
  { directory: "documents", routingExtension: ".document", languageExtensions: [".documentfolder"] },
  { directory: "letterhead", routingExtension: ".letter" },
  { directory: "quickactions", routingExtension: ".quickaction", languageExtensions: [".quickAction"] },
  { directory: "workflows", routingExtension: ".workflow" },
  { directory: "sharingrules", routingExtension: ".sharingrules", languageExtensions: [".sharingRules"] },
  {
    directory: "sharingsets",
    routingExtension: ".sharingset",
    languageExtensions: [".sharingSet"],
    routingDirectoryAliases: ["sharingset", "sharingSets"]
  },
  {
    directory: "restrictionrules",
    routingExtension: ".restrictionrule",
    languageExtensions: [".restrictionRule"],
    routingDirectoryAliases: ["restrictionrule", "restrictionRules"]
  },
  {
    directory: "scopingrules",
    routingExtension: ".scopingrule",
    languageExtensions: [".scopingRule"],
    routingDirectoryAliases: ["scopingrule", "scopingRules"]
  },
  { directory: "standardvaluesets", routingExtension: ".standardvalueset", languageExtensions: [".standardValueSet"] },
  { directory: "globalvaluesets", routingExtension: ".globalvalueset", languageExtensions: [".globalValueSet"] },
  { directory: "pathassistants", routingExtension: ".pathassistant", languageExtensions: [".pathAssistant"] },
  { directory: "remotesitesettings", routingExtension: ".remotesite", languageExtensions: [".remoteSite"] },
  { directory: "assignmentrules", routingExtension: ".assignmentrules", languageExtensions: [".assignmentRules"] },
  { directory: "escalationrules", routingExtension: ".escalationrules", languageExtensions: [".escalationRules"] },
  { directory: "matchingrules", routingExtension: ".matchingrule", languageExtensions: [".matchingRule"] },
  { directory: "duplicaterules", routingExtension: ".duplicaterule", languageExtensions: [".duplicateRule"] },
  { directory: "emailservices", routingExtension: ".emailservice", languageExtensions: [".emailService"] },
  { directory: "autoresponserules", routingExtension: ".autoresponserules", languageExtensions: [".autoResponseRules"] },
  { directory: "authproviders", routingExtension: ".authprovider", languageExtensions: [".authProvider"] },
  {
    directory: "externalauthidentityproviders",
    routingExtension: ".externalauthidentityprovider",
    languageExtensions: [".externalAuthIdentityProvider"]
  },
  { directory: "namedcredentials", routingExtension: ".namedcredential", languageExtensions: [".namedCredential"] },
  { directory: "externalcredentials", routingExtension: ".externalcredential", languageExtensions: [".externalCredential"] },
  { directory: "datasources", routingExtension: ".datasource", languageExtensions: [".dataSource"] },
  { directory: "csptrustedsites", routingExtension: ".csptrustedsite", languageExtensions: [".cspTrustedSite"] },
  {
    directory: "experiencepropertytypebundles",
    routingExtension: ".experiencepropertytypebundle",
    languageExtensions: [".experiencePropertyTypeBundle"]
  },
  { directory: "dashboards", routingExtension: ".dashboard" },
  { directory: "reporttypes", routingExtension: ".reporttype", languageExtensions: [".reportType"] },
  { directory: "reports", routingExtension: ".report" },
  { directory: "groups", routingExtension: ".group", routingDirectoryAliases: ["group"] },
  { directory: "queues", routingExtension: ".queue", routingDirectoryAliases: ["queue"] },
  { directory: "connectedapps", routingExtension: ".connectedapp", languageExtensions: [".connectedApp"] },
  { directory: "roles", routingExtension: ".role", routingDirectoryAliases: ["role"] },
  { directory: "communities", routingExtension: ".community", routingDirectoryAliases: ["community"] },
  { directory: "approvalprocesses", routingExtension: ".approvalprocess", languageExtensions: [".approvalProcess"] },
  { directory: "homepagelayouts", routingExtension: ".homepagelayout", languageExtensions: [".homePageLayout"] },
  { directory: "samlssoconfigs", routingExtension: ".samlssoconfig", languageExtensions: [".samlSsoConfig"] },
  { directory: "corswhitelistorigins", routingExtension: ".corswhitelistorigin", languageExtensions: [".corsWhitelistOrigin"] },
  { directory: "sites", routingExtension: ".site", routingDirectoryAliases: ["sitedotcomsites", "experiences"] },
  { directory: "testsuites", routingExtension: ".testsuite" },
  { directory: "networkbranding", routingExtension: ".networkbranding", languageExtensions: [".networkBranding"] },
  { directory: "networks", routingExtension: ".network" },
  { directory: "topicsforobjects", routingExtension: ".topicsforobjects", languageExtensions: [".topicsForObjects"] },
  { directory: "territories", routingExtension: ".territory", routingDirectoryAliases: ["territory"] },
  { directory: "territory2s", routingExtension: ".territory2", routingDirectoryAliases: ["territory2"] },
  {
    directory: "territory2models",
    routingExtension: ".territory2model",
    languageExtensions: [".territory2Model"],
    routingDirectoryAliases: ["territory2model", "territory2Models"]
  },
  {
    directory: "territory2rules",
    routingExtension: ".territory2rule",
    languageExtensions: [".territory2Rule"],
    routingDirectoryAliases: ["territory2rule", "territory2Rules"]
  },
  {
    directory: "territory2types",
    routingExtension: ".territory2type",
    languageExtensions: [".territory2Type"],
    routingDirectoryAliases: ["territory2type", "territory2Types"]
  },
  { directory: "compactlayouts", routingExtension: ".compactlayout", languageExtensions: [".compactLayout"] },
  { directory: "fieldsets", routingExtension: ".fieldset", languageExtensions: [".fieldSet"] },
  { directory: "businessprocesses", routingExtension: ".businessprocess", languageExtensions: [".businessProcess"] },
  { directory: "recordtypes", routingExtension: ".recordtype", languageExtensions: [".recordType"] },
  { directory: "weblinks", routingExtension: ".weblink", languageExtensions: [".webLink"] },
  { directory: "validationrules", routingExtension: ".validationrule", languageExtensions: [".validationRule"] },
  {
    directory: "sharingreasons",
    routingExtension: ".sharingreason",
    languageExtensions: [".sharingReason"],
    routingDirectoryAliases: ["sharingreason", "sharingReasons"]
  },
  { directory: "listviews", routingExtension: ".listview", languageExtensions: [".listView"] },
  {
    directory: "milestonetypes",
    routingExtension: ".milestonetype",
    languageExtensions: [".milestoneType"],
    routingDirectoryAliases: ["milestonetype", "milestoneTypes"]
  },
  { directory: "milestones", routingExtension: ".milestone", routingDirectoryAliases: ["milestone"] },
  {
    directory: "customindexes",
    routingExtension: ".customindex",
    routingDirectoryAliases: ["customindex"]
  },
  {
    directory: "dataweaveresources",
    routingExtension: ".dataweaveresource",
    routingDirectoryAliases: ["dataweaveresource", "dw"]
  },
  {
    directory: "emailtemplates",
    routingExtension: ".emailtemplate",
    languageExtensions: [".emailfolder"],
    routingDirectoryAliases: ["email", "emailtemplate"]
  },
  {
    directory: "customfields",
    routingExtension: ".field",
    languageExtensions: [".customfield"],
    routingDirectoryAliases: ["fields", "field"]
  },
  {
    directory: "customfieldtranslations",
    routingExtension: ".fieldtranslation",
    languageExtensions: [".customfieldtranslation"],
    routingDirectoryAliases: ["fieldtranslations", "fieldtranslation"]
  },
  {
    directory: "homepagecomponents",
    routingExtension: ".homepagecomponent",
    languageExtensions: [".homePageComponent"],
    routingDirectoryAliases: ["homepagecomponents", "homepagecomponent"]
  },
  {
    directory: "staticresources",
    routingExtension: ".resource-meta.xml",
    routingDirectoryAliases: ["staticresources"]
  },
  {
    directory: "contentassets",
    routingExtension: ".asset-meta.xml",
    routingDirectoryAliases: ["contentassets"]
  },
  {
    directory: "apexclasses",
    routingExtension: ".cls-meta.xml",
    routingDirectoryAliases: ["classes", "class"]
  },
  {
    directory: "apextriggers",
    routingExtension: ".trigger-meta.xml",
    routingDirectoryAliases: ["triggers", "trigger"]
  },
  {
    directory: "apexpages",
    routingExtension: ".page-meta.xml",
    routingDirectoryAliases: ["pages", "page"]
  },
  {
    directory: "apexcomponents",
    routingExtension: ".component-meta.xml",
    routingDirectoryAliases: ["components", "component"]
  },
  {
    directory: "auradefinitionbundles",
    routingExtension: ".cmp-meta.xml",
    languageExtensions: [".app-meta.xml", ".evt-meta.xml", ".js-meta.xml"],
    routingDirectoryAliases: ["aura"]
  },
  {
    directory: "lightningcomponentbundles",
    routingExtension: ".js-meta.xml",
    routingDirectoryAliases: ["lwc"]
  },
  {
    directory: "packages",
    routingExtension: ".package.xml",
    routingBasenames: ["package.xml", "destructivechanges.xml"]
  },
  {
    directory: "rulesets",
    routingExtension: ".ruleset.xml",
    routingBasenames: ["ruleset.xml"]
  },
  {
    directory: "experiencebundles",
    routingExtension: ".experiencebundle",
    routingDirectoryAliases: ["experiencebundle"]
  }
];

export const METADATA_XML_FAMILIES = METADATA_FAMILIES.map((family) => ({
  directory: family.directory,
  routingExtension: family.routingExtension,
  routingDirectoryAliases: [...(family.routingDirectoryAliases ?? [])],
  languageExtensions: [...(family.languageExtensions ?? [])],
  routingBasenames: [...(family.routingBasenames ?? [])]
}));

export const METADATA_XML_BASE_EXTENSIONS = ["-meta.xml", ".xml.tmp"] as const;
export const METADATA_XML_BASE_FILENAMES = ["sfdx-workspace.iml"] as const;
export const METADATA_XML_FAMILY_DIRECTORIES = METADATA_FAMILIES.map((family) => family.directory);
export const METADATA_XML_ROUTING_DIRECTORIES = [
  ...new Set(
    METADATA_FAMILIES.flatMap((family) => [family.directory, ...(family.routingDirectoryAliases ?? [])])
  )
];
export const METADATA_XML_ROUTING_EXTENSIONS = METADATA_FAMILIES.map((family) => family.routingExtension);
export const METADATA_XML_LANGUAGE_EXTENSIONS = [
  ...new Set(
    METADATA_FAMILIES.flatMap((family) => [family.routingExtension, ...(family.languageExtensions ?? [])])
  )
];
