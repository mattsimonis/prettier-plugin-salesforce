import { METADATA_XML_FAMILIES, METADATA_XML_ROUTING_DIRECTORIES } from "./metadata-families.js";
import { extractRootTagLocalName } from "./xml/salesforce-metadata-root-tags.js";

const METADATA_DIRECTORY_PATTERN = new RegExp(`(^|/)(${METADATA_XML_ROUTING_DIRECTORIES.join("|")})/`);
const METADATA_CANONICAL_FAMILY_BY_DIRECTORY = new Map<string, string>(
  METADATA_XML_FAMILIES.flatMap((family) =>
    [family.directory, ...family.routingDirectoryAliases].map((directory) => [directory.toLowerCase(), family.directory] as const)
  )
);
const METADATA_CANONICAL_FAMILY_BY_ROOT_TAG = new Map<string, string>([
  ["accountsettings", "settings"],
  ["analyticssettings", "settings"],
  ["casesettings", "settings"],
  ["apexclass", "apexclasses"],
  ["apexcomponent", "apexcomponents"],
  ["apexpage", "apexpages"],
  ["apextrigger", "apextriggers"],
  ["auradefinitionbundle", "auradefinitionbundles"],
  ["approvalprocess", "approvalprocesses"],
  ["assignmentrules", "assignmentrules"],
  ["audience", "audiences"],
  ["authprovider", "authproviders"],
  ["autoresponserules", "autoresponserules"],
  ["bot", "bots"],
  ["bottemplate", "bottemplates"],
  ["botversion", "botversions"],
  ["businessprocess", "businessprocesses"],
  ["compactlayout", "compactlayouts"],
  ["companysettings", "settings"],
  ["connectedapp", "connectedapps"],
  ["contentasset", "contentassets"],
  ["corswhitelistorigin", "corswhitelistorigins"],
  ["customapplication", "applications"],
  ["customlabels", "labels"],
  ["custommetadata", "custommetadata"],
  ["customnotificationtype", "notificationtypes"],
  ["customobject", "objects"],
  ["customobjecttranslation", "objecttranslations"],
  ["custompermission", "custompermissions"],
  ["custompageweblink", "weblinks"],
  ["customfield", "customfields"],
  ["customfieldtranslation", "customfieldtranslations"],
  ["customindex", "customindexes"],
  ["csptrustedsite", "csptrustedsites"],
  ["customsite", "sites"],
  ["customtab", "tabs"],
  ["dashboard", "dashboards"],
  ["dashboardfolder", "dashboards"],
  ["duplicaterule", "duplicaterules"],
  ["datasource", "datasources"],
  ["externaldatasource", "datasources"],
  ["emailservicesfunction", "emailservices"],
  ["experiencebundle", "experiencebundles"],
  ["escalationrules", "escalationrules"],
  ["experiencepropertytypebundle", "experiencepropertytypebundles"],
  ["externalauthidentityprovider", "externalauthidentityproviders"],
  ["externalcredential", "externalcredentials"],
  ["fieldset", "fieldsets"],
  ["flexipage", "flexipages"],
  ["flow", "flows"],
  ["flowdefinition", "flowdefinitions"],
  ["globalvalueset", "globalvaluesets"],
  ["globalvaluesettranslation", "globalvaluesettranslations"],
  ["group", "groups"],
  ["homepagelayout", "homepagelayouts"],
  ["homepagecomponent", "homepagecomponents"],
  ["layout", "layouts"],
  ["listview", "listviews"],
  ["lightningcomponentbundle", "lightningcomponentbundles"],
  ["matchingrules", "matchingrules"],
  ["matchingrule", "matchingrules"],
  ["managedcontenttype", "managedcontenttypes"],
  ["milestone", "milestones"],
  ["milestonetype", "milestonetypes"],
  ["network", "networks"],
  ["networkbranding", "networkbranding"],
  ["namedcredential", "namedcredentials"],
  ["permissionsetlicense", "permissionsetlicenses"],
  ["permissionsetgroup", "permissionsetgroups"],
  ["permissionset", "permissionsets"],
  ["portaldelegablepermissionset", "portaldelegablepermissionsets"],
  ["opportunitysettings", "settings"],
  ["pathassistant", "pathassistants"],
  ["pathassistantsettings", "settings"],
  ["package", "packages"],
  ["queue", "queues"],
  ["quickaction", "quickactions"],
  ["profile", "profiles"],
  ["recordtype", "recordtypes"],
  ["remotesitesetting", "remotesitesettings"],
  ["reportfolder", "reports"],
  ["reporttype", "reporttypes"],
  ["report", "reports"],
  ["restrictionrule", "restrictionrules"],
  ["role", "roles"],
  ["samlssoconfig", "samlssoconfigs"],
  ["scopingrule", "scopingrules"],
  ["securitysettings", "settings"],
  ["sharingrules", "sharingrules"],
  ["sharingreason", "sharingreasons"],
  ["sharingset", "sharingsets"],
  ["standardvalueset", "standardvaluesets"],
  ["standardvaluesettranslation", "standardvaluesettranslations"],
  ["staticresource", "staticresources"],
  ["sitedotcom", "sites"],
  ["settings", "settings"],
  ["territory", "territories"],
  ["territory2model", "territory2models"],
  ["territory2rule", "territory2rules"],
  ["territory2", "territory2s"],
  ["territory2type", "territory2types"],
  ["topicsforobjects", "topicsforobjects"],
  ["translations", "translations"],
  ["userengagementsettings", "settings"],
  ["userinterfacesettings", "settings"],
  ["validationrule", "validationrules"],
  ["weblink", "weblinks"],
  ["workflow", "workflows"],
  ["navigationmenu", "navigationmenus"],
  ["lightningmessagechannel", "messagechannels"],
  ["platformcachepartition", "cachepartitions"],
  ["prompt", "prompts"],
  ["ruleset", "rulesets"],
  ["featureparameterboolean", "featureparameters"],
  ["featureparameterdate", "featureparameters"],
  ["featureparameterinteger", "featureparameters"],
  ["document", "documents"],
  ["documentfolder", "documents"],
  ["dataweaveresource", "dataweaveresources"],
  ["emailtemplate", "emailtemplates"],
  ["emailfolder", "emailtemplates"],
  ["letterhead", "letterhead"],
  ["community", "communities"],
  ["apextestsuite", "testsuites"]
]);

const METADATA_FAMILY_EXTENSION_BY_DIRECTORY = new Map<string, Set<string>>(
  METADATA_XML_FAMILIES.flatMap((family) => {
    const extensions = new Set([family.routingExtension, ...family.languageExtensions].map((value) => value.toLowerCase()));
    return [family.directory, ...family.routingDirectoryAliases].map((directory) => [directory.toLowerCase(), extensions] as const);
  })
);
const METADATA_VARIANT_TO_DIRECTORY = buildMetadataVariantDirectoryMap();

export function metadataFamilyDirectoryFromPath(normalizedLowerPath: string): string | null {
  const normalizedPath = normalizeToLowerPath(normalizedLowerPath);
  const segments = normalizedPath.split("/");
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    const mapped = METADATA_VARIANT_TO_DIRECTORY.get(segment);
    if (mapped) {
      return mapped;
    }
  }
  const match = METADATA_DIRECTORY_PATTERN.exec(normalizedPath);
  if (!match) {
    return null;
  }
  return match[2] ?? null;
}

export function metadataCanonicalFamilyFromPath(normalizedLowerPath: string): string | null {
  const normalizedPath = normalizeToLowerPath(normalizedLowerPath);
  const specialPathFamily = metadataCanonicalFamilyFromSpecialPath(normalizedPath);
  if (specialPathFamily) {
    return specialPathFamily;
  }

  const suffixFamily = metadataCanonicalFamilyFromMetaXmlSuffix(normalizedPath);
  if (suffixFamily) {
    return suffixFamily;
  }

  const matchedDirectory = metadataFamilyDirectoryFromPath(normalizedPath);
  if (!matchedDirectory) {
    return null;
  }
  return METADATA_CANONICAL_FAMILY_BY_DIRECTORY.get(matchedDirectory) ?? null;
}

export function metadataCanonicalFamilyFromMetadataSource(source: string): string | null {
  const root = extractRootTagLocalName(source)?.toLowerCase();
  if (!root) {
    return null;
  }
  return METADATA_CANONICAL_FAMILY_BY_ROOT_TAG.get(root) ?? null;
}

export function isMetadataFamilyPathWithAllowedExtension(normalizedLowerPath: string): boolean {
  const normalizedPath = normalizeToLowerPath(normalizedLowerPath);
  const segments = normalizedPath.split("/");
  for (const segment of segments) {
    const familyDirectory = METADATA_VARIANT_TO_DIRECTORY.get(segment);
    if (!familyDirectory) {
      continue;
    }
    const familyExtensions = METADATA_FAMILY_EXTENSION_BY_DIRECTORY.get(familyDirectory);
    if (!familyExtensions) {
      continue;
    }
    if ([...familyExtensions].some((suffix) => normalizedPath.endsWith(suffix))) {
      return true;
    }
  }
  return false;
}

export function metadataCanonicalFamilyFromKnownExtension(normalizedLowerPath: string): string | null {
  const normalizedPath = normalizeToLowerPath(normalizedLowerPath);
  const specialPathFamily = metadataCanonicalFamilyFromSpecialPath(normalizedPath);
  const extension = extensionFromPath(normalizedPath);
  if (specialPathFamily && (extension.endsWith(".xml") || extension.endsWith(".meta.xml"))) {
    return specialPathFamily;
  }

  const suffixFamily = metadataCanonicalFamilyFromMetaXmlSuffix(normalizedPath);
  if (suffixFamily) {
    return suffixFamily;
  }

  const matches: string[] = [];
  for (const [extension, families] of METADATA_FAMILY_BY_EXTENSION) {
    if (!normalizedPath.endsWith(extension)) {
      continue;
    }
    for (const family of families) {
      if (!matches.includes(family)) {
        matches.push(family);
      }
    }
  }

  if (matches.length !== 1) {
    return null;
  }
  return matches[0] ?? null;
}

function normalizeToLowerPath(filePath: string): string {
  return filePath.replaceAll("\\", "/").toLowerCase();
}

function extensionFromPath(normalizedPath: string): string {
  const lastSlash = normalizedPath.lastIndexOf("/");
  const basename = lastSlash >= 0 ? normalizedPath.slice(lastSlash + 1) : normalizedPath;
  const lastDot = basename.lastIndexOf(".");
  if (lastDot < 0) {
    return "";
  }
  return basename.slice(lastDot);
}

function buildMetadataVariantDirectoryMap(): Map<string, string> {
  const variants = new Map<string, string>();
  for (const directory of METADATA_FAMILY_EXTENSION_BY_DIRECTORY.keys()) {
    for (const variant of impliedDirectoryVariants(directory)) {
      const existing = variants.get(variant);
      if (existing && existing !== directory) {
        continue;
      }
      variants.set(variant, directory);
    }
  }
  return variants;
}

function impliedDirectoryVariants(directory: string): string[] {
  const variants = new Set<string>([directory]);

  if (directory.endsWith("ies") && directory.length > 3) {
    variants.add(`${directory.slice(0, -3)}y`);
  }
  if (directory.endsWith("es") && directory.length > 3) {
    variants.add(directory.slice(0, -2));
  }
  if (directory.endsWith("s") && directory.length > 2) {
    variants.add(directory.slice(0, -1));
  }

  return [...variants];
}

function metadataCanonicalFamilyFromSpecialPath(normalizedLowerPath: string): string | null {
  if (normalizedLowerPath.endsWith(".js-meta.xml")) {
    if (normalizedLowerPath.includes("/aura/")) {
      return "auradefinitionbundles";
    }
    if (normalizedLowerPath.includes("/lwc/")) {
      return "lightningcomponentbundles";
    }
    if (normalizedLowerPath.includes("/lightningcomponentbundles/")) {
      return "lightningcomponentbundles";
    }
  }

  if (normalizedLowerPath.endsWith(".app-meta.xml") && normalizedLowerPath.includes("/aura/")) {
    return "auradefinitionbundles";
  }

  if (
    normalizedLowerPath.includes("/objecttranslations/") &&
    (normalizedLowerPath.endsWith(".fieldtranslation-meta.xml") || normalizedLowerPath.endsWith(".fieldtranslation"))
  ) {
    return "customfieldtranslations";
  }

  if (normalizedLowerPath.includes("/experiences/") && normalizedLowerPath.endsWith(".site-meta.xml")) {
    return "experiencebundles";
  }

  if (normalizedLowerPath.endsWith("/ruleset.xml")) {
    return "rulesets";
  }

  if (normalizedLowerPath.endsWith("/package.xml") || normalizedLowerPath.endsWith("/destructivechanges.xml")) {
    return "packages";
  }
  if (isLikelyPackageManifestPath(normalizedLowerPath)) {
    return "packages";
  }
  if (
    normalizedLowerPath.endsWith(".app") &&
    (normalizedLowerPath.includes("/exports/") || normalizedLowerPath.startsWith("exports/"))
  ) {
    return "applications";
  }
  if (isLikelyExportedCustomMetadataPath(normalizedLowerPath)) {
    return "custommetadata";
  }

  return null;
}

function metadataCanonicalFamilyFromMetaXmlSuffix(normalizedLowerPath: string): string | null {
  for (const [suffix, family] of METADATA_FAMILY_BY_META_XML_SUFFIX) {
    if (normalizedLowerPath.endsWith(suffix)) {
      return family;
    }
  }
  return null;
}

function isLikelyPackageManifestPath(normalizedLowerPath: string): boolean {
  if (!normalizedLowerPath.endsWith(".xml")) {
    return false;
  }
  const inManifestLikeDirectory =
    normalizedLowerPath.includes("/manifest/") ||
    normalizedLowerPath.includes("/manifests/") ||
    normalizedLowerPath.includes("/lib/");
  if (!inManifestLikeDirectory) {
    return false;
  }

  const segments = normalizedLowerPath.split("/");
  const basename = segments.at(-1) ?? "";
  return (
    basename.includes("package") ||
    basename.includes("destructive") ||
    basename.includes("delta") ||
    basename.includes("profile")
  );
}

const METADATA_FAMILY_BY_META_XML_SUFFIX_MANUAL: Array<[suffix: string, family: string]> = [
  [".cls-meta.xml", "apexclasses"],
  [".trigger-meta.xml", "apextriggers"],
  [".page-meta.xml", "apexpages"],
  [".component-meta.xml", "apexcomponents"],
  [".permissionset-meta.xml", "permissionsets"],
  [".profile-meta.xml", "profiles"],
  [".flow-meta.xml", "flows"],
  [".tab-meta.xml", "tabs"],
  [".quickaction-meta.xml", "quickactions"],
  [".permissionsetgroup-meta.xml", "permissionsetgroups"],
  [".custompermission-meta.xml", "custompermissions"],
  [".permissionsetlicense-meta.xml", "permissionsetlicenses"],
  [".portaldelegablepermissionset-meta.xml", "portaldelegablepermissionsets"],
  [".namedcredential-meta.xml", "namedcredentials"],
  [".externalcredential-meta.xml", "externalcredentials"],
  [".objecttranslation-meta.xml", "objecttranslations"],
  [".standardvaluesettranslation-meta.xml", "standardvaluesettranslations"],
  [".globalvaluesettranslation-meta.xml", "globalvaluesettranslations"],
  [".fieldtranslation-meta.xml", "customfieldtranslations"],
  [".labels-meta.xml", "labels"]
];

const METADATA_FAMILY_BY_META_XML_SUFFIX: Array<[suffix: string, family: string]> = buildMetadataMetaXmlSuffixMappings();
const METADATA_FAMILY_BY_EXTENSION: Array<[extension: string, families: string[]]> = buildMetadataExtensionMappings();

function buildMetadataMetaXmlSuffixMappings(): Array<[suffix: string, family: string]> {
  const out = new Map<string, string>();
  for (const [suffix, family] of METADATA_FAMILY_BY_META_XML_SUFFIX_MANUAL) {
    out.set(suffix, family);
  }

  for (const family of METADATA_XML_FAMILIES) {
    const extensions = [family.routingExtension, ...family.languageExtensions].map((value) => value.toLowerCase());
    for (const extension of extensions) {
      const suffix = toMetaXmlSuffix(extension);
      if (!suffix) {
        continue;
      }
      if (!out.has(suffix)) {
        out.set(suffix, family.directory);
      }
    }
  }

  return [...out.entries()].sort((left, right) => left[0].localeCompare(right[0]));
}

function toMetaXmlSuffix(extension: string): string | null {
  if (!extension.startsWith(".")) {
    return null;
  }
  if (extension.endsWith("-meta.xml")) {
    return extension;
  }
  if (extension.endsWith(".xml")) {
    return null;
  }
  return `${extension}-meta.xml`;
}

function buildMetadataExtensionMappings(): Array<[extension: string, families: string[]]> {
  const familiesByExtension = new Map<string, Set<string>>();
  for (const family of METADATA_XML_FAMILIES) {
    const extensions = [family.routingExtension, ...family.languageExtensions].map((value) => value.toLowerCase());
    for (const extension of extensions) {
      if (!isExtensionEligibleForKnownExtensionMapping(extension)) {
        continue;
      }
      const set = familiesByExtension.get(extension) ?? new Set<string>();
      set.add(family.directory);
      familiesByExtension.set(extension, set);
    }
  }

  return [...familiesByExtension.entries()]
    .map(
      ([extension, families]): [extension: string, families: string[]] => [
        extension,
        [...families].sort((a, b) => a.localeCompare(b))
      ]
    )
    .sort((left, right) => left[0].localeCompare(right[0]));
}

function isExtensionEligibleForKnownExtensionMapping(extension: string): boolean {
  // Keep path-context dependent families out of global extension fallback.
  if (extension === ".app" || extension === ".js-meta.xml" || extension === ".app-meta.xml") {
    return false;
  }
  if (extension === ".md") {
    return false;
  }
  if (extension.endsWith(".xml")) {
    return false;
  }
  return extension.startsWith(".");
}

function isLikelyExportedCustomMetadataPath(normalizedLowerPath: string): boolean {
  if (!(normalizedLowerPath.includes("/exports/") || normalizedLowerPath.startsWith("exports/"))) {
    return false;
  }
  const basename = normalizedLowerPath.split("/").at(-1) ?? "";
  const match = /^([^.\/]+)\.([^.\/]+)\.md$/.exec(basename);
  if (!match) {
    return false;
  }
  const typeName = match[1];
  const recordName = match[2];
  if (!typeName || !recordName) {
    return false;
  }
  if (COMMON_MARKDOWN_EXPORT_BASENAMES.has(typeName)) {
    return false;
  }
  if (/^v\d+$/.test(recordName)) {
    return false;
  }
  if (/^\d{4}$/.test(recordName)) {
    return false;
  }
  return true;
}

const COMMON_MARKDOWN_EXPORT_BASENAMES = new Set([
  "readme",
  "release",
  "releases",
  "changelog",
  "notes",
  "guide",
  "guides",
  "docs",
  "documentation"
]);
