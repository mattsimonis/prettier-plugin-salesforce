import prettier from "prettier";
import { describe, expect, it } from "vitest";
import plugin from "./index.js";
import { routeFile } from "./routing.js";

type InferenceSurfaceCase = {
  filepath: string;
  expectedRoute: ReturnType<typeof routeFile>;
  expectedInferredParser: string | null;
};

const cases: InferenceSurfaceCase[] = [
  {
    filepath: "/tmp/force-app/main/default/classes/Foo.cls",
    expectedRoute: "apex",
    expectedInferredParser: "salesforce-apex"
  },
  {
    filepath: "/tmp/scripts/run.apex",
    expectedRoute: "apex-anonymous",
    expectedInferredParser: "salesforce-apex-anonymous"
  },
  {
    filepath: "/tmp/scripts/deleteRecreateTdtmRecords",
    expectedRoute: "apex-anonymous",
    expectedInferredParser: "salesforce-apex-anonymous"
  },
  {
    filepath: "/tmp/scripts/deleteSettings",
    expectedRoute: "apex-anonymous",
    expectedInferredParser: "salesforce-apex-anonymous"
  },
  {
    filepath: "/tmp/force-app/main/default/pages/Account.page",
    expectedRoute: "markup",
    expectedInferredParser: "salesforce-markup"
  },
  {
    filepath: "/tmp/force-app/main/default/aura/Widget/Widget.cmp",
    expectedRoute: "markup",
    expectedInferredParser: "salesforce-markup"
  },
  {
    filepath: "/tmp/force-app/main/default/components/Widget.tokens",
    expectedRoute: "markup",
    expectedInferredParser: "salesforce-markup"
  },
  {
    filepath: "/tmp/force-app/main/default/aura/Widget/Widget.app",
    expectedRoute: "markup",
    expectedInferredParser: "salesforce-router-by-path"
  },
  {
    filepath: "/tmp/force-app/main/default/applications/Console.app",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-router-by-path"
  },
  {
    filepath: "/tmp/exports/Widget.app",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-router-by-path"
  },
  {
    filepath: "/tmp/exports/Feature.Default.md",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-router-by-path"
  },
  {
    filepath: "/tmp/exports/Readme.Setup.md",
    expectedRoute: "prettier-core",
    expectedInferredParser: "salesforce-router-by-path"
  },
  {
    filepath: "/tmp/exports/Changelog.2026.md",
    expectedRoute: "prettier-core",
    expectedInferredParser: "salesforce-router-by-path"
  },
  {
    filepath: "/tmp/exports/Release.v1.md",
    expectedRoute: "prettier-core",
    expectedInferredParser: "salesforce-router-by-path"
  },
  {
    filepath: "/tmp/force-app/main/default/lwc/widget/widget.html",
    expectedRoute: "lwc-html",
    expectedInferredParser: "salesforce-router-by-path"
  },
  {
    filepath: "/tmp/force-app/main/default/aura/not-lwc.html",
    expectedRoute: "prettier-core",
    expectedInferredParser: "salesforce-router-by-path"
  },
  {
    filepath: "/tmp/force-app/main/default/lwc/widget/widget.js",
    expectedRoute: "prettier-core",
    expectedInferredParser: "babel"
  },
  {
    filepath: "/tmp/force-app/main/default/staticresources/ckeditor/ckeditor.mjs",
    expectedRoute: "prettier-core",
    expectedInferredParser: "babel"
  },
  {
    filepath: "/tmp/force-app/main/default/staticresources/ckeditor/ckeditor.cjs",
    expectedRoute: "prettier-core",
    expectedInferredParser: "babel"
  },
  {
    filepath: "/tmp/force-app/main/default/scripts/theme.less",
    expectedRoute: "prettier-core",
    expectedInferredParser: "less"
  },
  {
    filepath: "/tmp/force-app/main/default/scripts/query.graphql",
    expectedRoute: "prettier-core",
    expectedInferredParser: "graphql"
  },
  {
    filepath: "/tmp/force-app/main/default/scripts/query.gql",
    expectedRoute: "prettier-core",
    expectedInferredParser: "graphql"
  },
  {
    filepath: "/tmp/force-app/main/default/scripts/module.mts",
    expectedRoute: "prettier-core",
    expectedInferredParser: "typescript"
  },
  {
    filepath: "/tmp/force-app/main/default/scripts/module.cts",
    expectedRoute: "prettier-core",
    expectedInferredParser: "typescript"
  },
  {
    filepath: "/tmp/force-app/main/default/scripts/component.vue",
    expectedRoute: "prettier-core",
    expectedInferredParser: "vue"
  },
  {
    filepath: "/tmp/force-app/main/default/scripts/config.json5",
    expectedRoute: "prettier-core",
    expectedInferredParser: "json5"
  },
  {
    filepath: "/tmp/force-app/main/default/scripts/config.jsonc",
    expectedRoute: "prettier-core",
    expectedInferredParser: "jsonc"
  },
  {
    filepath: "/tmp/force-app/main/default/scripts/site.webmanifest",
    expectedRoute: "prettier-core",
    expectedInferredParser: "json"
  },
  {
    filepath: "/tmp/force-app/main/default/scripts/template.hbs",
    expectedRoute: "prettier-core",
    expectedInferredParser: "glimmer"
  },
  {
    filepath: "/tmp/force-app/main/default/scripts/template.handlebars",
    expectedRoute: "prettier-core",
    expectedInferredParser: "glimmer"
  },
  {
    filepath: "/tmp/force-app/main/default/scripts/schema.graphqls",
    expectedRoute: "prettier-core",
    expectedInferredParser: "graphql"
  },
  {
    filepath: "/tmp/force-app/main/default/scripts/map.geojson",
    expectedRoute: "prettier-core",
    expectedInferredParser: "json"
  },
  {
    filepath: "/tmp/force-app/main/default/scripts/schema.avsc",
    expectedRoute: "prettier-core",
    expectedInferredParser: "json"
  },
  {
    filepath: "/tmp/force-app/main/default/scripts/notes.mkd",
    expectedRoute: "prettier-core",
    expectedInferredParser: "markdown"
  },
  {
    filepath: "/tmp/force-app/main/default/scripts/template.mjml",
    expectedRoute: "prettier-core",
    expectedInferredParser: "mjml"
  },
  {
    filepath: "/tmp/force-app/main/default/scripts/notes.mdx",
    expectedRoute: "prettier-core",
    expectedInferredParser: "mdx"
  },
  {
    filepath: "/tmp/force-app/main/default/objects/Widget__c/Widget__c.object-meta.xml",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-metadata-xml"
  },
  {
    filepath: "/tmp/force-app/main/default/objects/Widget__c/fields/Status__c.field-meta.xml",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-metadata-xml"
  },
  {
    filepath: "/tmp/force-app/main/default/customMetadata/Feature.Default.md",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-router-by-path"
  },
  {
    filepath: "/tmp/force-app/main/default/customMetadata/README.md",
    expectedRoute: "prettier-core",
    expectedInferredParser: "salesforce-router-by-path"
  },
  {
    filepath: "/tmp/exports/CustomLabels.labels",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-metadata-xml"
  },
  {
    filepath: "/tmp/workspace/.idea/sfdx-workspace.iml",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-metadata-xml"
  },
  {
    filepath: "/tmp/force-app/main/default/managedContentTypes/Blog.managedContentType",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-metadata-xml"
  },
  {
    filepath: "/tmp/force-app/main/default/bots/Support_Bot.bot",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-metadata-xml"
  },
  {
    filepath: "/tmp/force-app/main/default/botVersions/Support_Bot/v7.botVersion",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-metadata-xml"
  },
  {
    filepath: "/tmp/force-app/main/default/botTemplates/ServiceAssistant.botTemplate",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-metadata-xml"
  },
  {
    filepath: "/tmp/force-app/main/default/email/welcome.email",
    expectedRoute: "payload-text",
    expectedInferredParser: "salesforce-router-by-path"
  },
  {
    filepath: "/tmp/force-app/main/default/scripts/reconcile.sql",
    expectedRoute: "unknown",
    expectedInferredParser: null
  },
  {
    filepath: "/tmp/force-app/main/default/marketing/restrictionRule.notes",
    expectedRoute: "unknown",
    expectedInferredParser: null
  },
  {
    filepath: "/tmp/force-app/main/default/lwc/widget/__tests__/__snapshots__/widget.spec.js.snap",
    expectedRoute: "unknown",
    expectedInferredParser: null
  },
  {
    filepath: "/tmp/force-app/main/default/.forceignore",
    expectedRoute: "payload-text",
    expectedInferredParser: "salesforce-router-by-path"
  },
  {
    filepath: "/tmp/force-app/main/default/permissionsets/SampleApp.permissionset-meta.xml.tmp",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-metadata-xml"
  },
  {
    filepath: "/tmp/exports/credentials/ERP.namedcredential-meta.xml",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-metadata-xml"
  },
  {
    filepath: "/tmp/exports/credentials/ERP.externalcredential-meta.xml",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-metadata-xml"
  },
  {
    filepath: "/tmp/exports/permissions/Contractor.permissionsetlicense-meta.xml",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-metadata-xml"
  },
  {
    filepath: "/tmp/exports/permissions/Partner.portaldelegablepermissionset-meta.xml",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-metadata-xml"
  },
  {
    filepath: "/tmp/exports/translations/Industry-en_US.standardvaluesettranslation-meta.xml",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-metadata-xml"
  },
  {
    filepath: "/tmp/exports/translations/Sample-en_US.globalvaluesettranslation-meta.xml",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-metadata-xml"
  },
  {
    filepath: "/tmp/exports/objecttranslations/Account-en_US.objecttranslation-meta.xml",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-metadata-xml"
  },
  {
    filepath: "/tmp/exports/objecttranslations/Account-en_US.Name.fieldtranslation-meta.xml",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-metadata-xml"
  },
  {
    filepath: "/tmp/exports/data/DWH.datasource-meta.xml",
    expectedRoute: "metadata-xml",
    expectedInferredParser: "salesforce-metadata-xml"
  },
  {
    filepath: "/tmp/force-app/main/default/CODEOWNERS",
    expectedRoute: "unknown",
    expectedInferredParser: null
  },
  {
    filepath: "/tmp/yarn.lock",
    expectedRoute: "unknown",
    expectedInferredParser: null
  }
];

describe("inference surface contract", () => {
  it.each(cases)("keeps route and inferred parser in sync for %s", async ({ filepath, expectedRoute, expectedInferredParser }) => {
    expect(routeFile(filepath)).toBe(expectedRoute);
    const info = await prettier.getFileInfo(filepath, { plugins: [plugin] });
    expect(info.inferredParser).toBe(expectedInferredParser);
  });
});
