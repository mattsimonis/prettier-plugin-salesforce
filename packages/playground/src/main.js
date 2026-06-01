import "./styles.css";
import * as prettier from "prettier/standalone";
import * as htmlPlugin from "prettier/plugins/html";
import * as markdownPlugin from "prettier/plugins/markdown";
import salesforcePlugin, { routeFile } from "prettier-plugin-salesforce/browser";
import {
  applySortLabelsToggle,
  configNumberBounds,
  defaultPlaygroundConfig,
  normalizePlaygroundConfigOptions,
  readChoice,
  readBoundedInteger,
  readSortLabelsToggle
} from "./config-options.js";
import { highlightSource } from "./highlight.js";
import { extraSamples } from "./samples.js";

const defaultConfig = defaultPlaygroundConfig;

const samples = [
  {
    group: "Apex",
    label: "Simple Class",
    complexity: "simple",
    filepath: "force-app/main/default/classes/InvoiceMath.cls",
    text: `public with sharing class InvoiceMath {
public static Decimal add(Decimal a, Decimal b) {
if (a == null) {
a = 0;
}
if (b == null) {
b = 0;
}
return a+b;
}
public static List<Invoice__c> openInvoices(){
List<Invoice__c> rows=[SELECT Id,Amount__c FROM Invoice__c LIMIT 10];
for(Invoice__c row:rows){
if(row.Amount__c==null){ row.Amount__c=0; }
}
return rows;
}
}`
  },
  {
    group: "Apex",
    label: "Trigger",
    complexity: "medium",
    filepath: "force-app/main/default/triggers/AccountTrigger.trigger",
    text: `trigger AccountTrigger on Account (before insert, before update) {
for (Account a : Trigger.new) {
if (String.isBlank(a.Name)) {
a.Name = 'New Account';
}
}
}`
  },
  {
    group: "Apex",
    label: "Anonymous Script",
    complexity: "medium",
    filepath: "scripts/recalculateBalances.apex",
    text: `List<Account> rows = [SELECT Id, Name FROM Account LIMIT 3];
for (Account a : rows) {
System.debug('acct ' + a.Name);
}`
  },
  {
    group: "Markup",
    label: "Visualforce Page",
    complexity: "simple",
    filepath: "force-app/main/default/pages/AccountSummary.page",
    text: `<apex:page>
<apex:pageBlock title="Summary">
<apex:outputText value="{!Account.Name}"/>
</apex:pageBlock>
</apex:page>`
  },
  {
    group: "Markup",
    label: "Aura Component",
    complexity: "medium",
    filepath: "force-app/main/default/aura/OrderCard/OrderCard.cmp",
    text: `<aura:component>
<aura:attribute name="order" type="Object"/>
<lightning:card title="{!v.order.Name}">
<p class="slds-p-horizontal_small">{!v.order.Amount__c}</p>
</lightning:card>
</aura:component>`
  },
  {
    group: "Markup",
    label: "LWC HTML",
    complexity: "simple",
    filepath: "force-app/main/default/lwc/orderSummary/orderSummary.html",
    text: `<template>
<lightning-card title="Order Summary">
<div class="slds-p-around_small">
<template if:true={order}>
<p>{order.Name}</p>
</template>
</div>
</lightning-card>
</template>`
  },
  {
    group: "Metadata",
    label: "Custom Labels",
    complexity: "simple",
    filepath: "force-app/main/default/labels/CustomLabels.labels-meta.xml",
    text: `<?xml version="1.0" encoding="UTF-8"?>
<CustomLabels xmlns="http://soap.sforce.com/2006/04/metadata">
<labels>
<categories>ui</categories>
<fullName>Z_Label</fullName>
<language>en_US</language>
<protected>false</protected>
<shortDescription>Z Label</shortDescription>
<value>Z value</value>
</labels>
<labels>
<categories>ui</categories>
<fullName>A_Label</fullName>
<language>en_US</language>
<protected>false</protected>
<shortDescription>A Label</shortDescription>
<value>A value</value>
</labels>
</CustomLabels>`
  },
  {
    group: "Metadata",
    label: "Permission Set",
    complexity: "large",
    filepath: "force-app/main/default/permissionsets/Billing.permissionset-meta.xml",
    text: `<?xml version="1.0" encoding="UTF-8"?>
<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">
<label>Billing Ops</label>
<classAccesses><apexClass>BillingService</apexClass><enabled>true</enabled></classAccesses>
<fieldPermissions><editable>true</editable><field>Invoice__c.Amount__c</field><readable>true</readable></fieldPermissions>
<objectPermissions><allowCreate>true</allowCreate><allowDelete>false</allowDelete><allowEdit>true</allowEdit><allowRead>true</allowRead><modifyAllRecords>false</modifyAllRecords><object>Invoice__c</object><viewAllRecords>false</viewAllRecords></objectPermissions>
</PermissionSet>`
  },
  {
    group: "Metadata",
    label: "Flow",
    complexity: "large",
    filepath: "force-app/main/default/flows/Invoice_Status.flow-meta.xml",
    text: `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
<apiVersion>61.0</apiVersion>
<interviewLabel>Invoice Status {!$Flow.CurrentDateTime}</interviewLabel>
<label>Invoice Status</label>
<processType>AutoLaunchedFlow</processType>
<recordUpdates><name>MarkPaid</name><label>Mark Paid</label><inputAssignments><field>Status__c</field><value><stringValue>Paid</stringValue></value></inputAssignments><object>Invoice__c</object></recordUpdates>
<start><connector><targetReference>MarkPaid</targetReference></connector></start>
<status>Draft</status>
</Flow>`
  },
  {
    group: "Metadata",
    label: "Object Translation",
    complexity: "large",
    filepath: "force-app/main/default/objectTranslations/Invoice__c-en_US.objectTranslation-meta.xml",
    text: `<?xml version="1.0" encoding="UTF-8"?>
<CustomObjectTranslation xmlns="http://soap.sforce.com/2006/04/metadata">
<caseValues><plural>false</plural><value>Invoices</value></caseValues>
<fields><label>Invoice Amount</label><name>Amount__c</name></fields>
<gender>Neuter</gender>
<nameFieldLabel>Invoice Name</nameFieldLabel>
<startsWith>Consonant</startsWith>
</CustomObjectTranslation>`
  },
  {
    group: "Metadata",
    label: "Profile",
    complexity: "large",
    filepath: "force-app/main/default/profiles/Standard.profile-meta.xml",
    text: `<?xml version="1.0" encoding="UTF-8"?>
<Profile xmlns="http://soap.sforce.com/2006/04/metadata">
<custom>false</custom>
<fieldPermissions><editable>false</editable><field>Invoice__c.Status__c</field><readable>true</readable></fieldPermissions>
<layoutAssignments><layout>Invoice__c-Invoice Layout</layout><recordType>Invoice__c.Standard</recordType></layoutAssignments>
<objectPermissions><allowCreate>true</allowCreate><allowDelete>false</allowDelete><allowEdit>true</allowEdit><allowRead>true</allowRead><modifyAllRecords>false</modifyAllRecords><object>Invoice__c</object><viewAllRecords>false</viewAllRecords></objectPermissions>
<userPermissions><enabled>true</enabled><name>ViewSetup</name></userPermissions>
</Profile>`
  },
  ...extraSamples
];

const app = document.querySelector("#app");
let errorPane;
let filepathInput;
let sampleSelect;
let sampleMeta;
let printWidthInput;
let tabWidthInput;
let trailingCommaSelect;
let useTabsToggle;
let singleQuoteToggle;
let bracketSameLineToggle;
let sortLabelsToggle;
let finalNewlineToggle;
let testVisiblePlacementSelect;
let blankLineBeforeCommentToggle;
let logicalOperatorPositionSelect;
let routeBadge;
let statusBadge;
let inputEditor;
let outputEditor;
let configEditor;
let formatRequestId = 0;

mountRoute();
window.addEventListener("hashchange", mountRoute);
document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-route]");
  if (!link) {
    return;
  }
  event.preventDefault();
  navigate(link.dataset.route);
});

function mountRoute() {
  if (isPlaygroundRoute()) {
    mountPlayground();
    return;
  }
  mountHome();
}

function isPlaygroundRoute() {
  return window.location.hash === "#playground";
}

function navigate(route) {
  window.location.hash = routeHash(route);
  mountRoute();
}

function routeHash(route) {
  return route === "playground" ? "#playground" : "#top";
}

function mountHome() {
  document.title = "Prettier Plugin Salesforce";
  document.body.classList.remove("playground-page");
  app.innerHTML = homeTemplate();
  for (const link of app.querySelectorAll('[data-route="playground"]')) {
    link.setAttribute("href", routeHash("playground"));
  }
}

function mountPlayground() {
  document.title = "Salesforce Formatting Playground";
  document.body.classList.add("playground-page");
  app.innerHTML = playgroundTemplate();
  const homeLink = app.querySelector('[data-route="home"]');
  homeLink.setAttribute("href", routeHash("home"));

  errorPane = document.querySelector("#errorPane");
  filepathInput = document.querySelector("#filepathInput");
  sampleSelect = document.querySelector("#sampleSelect");
  sampleMeta = document.querySelector("#sampleMeta");
  printWidthInput = document.querySelector("#printWidthInput");
  tabWidthInput = document.querySelector("#tabWidthInput");
  trailingCommaSelect = document.querySelector("#trailingCommaSelect");
  useTabsToggle = document.querySelector("#useTabsToggle");
  singleQuoteToggle = document.querySelector("#singleQuoteToggle");
  bracketSameLineToggle = document.querySelector("#bracketSameLineToggle");
  sortLabelsToggle = document.querySelector("#sortLabelsToggle");
  finalNewlineToggle = document.querySelector("#finalNewlineToggle");
  testVisiblePlacementSelect = document.querySelector("#testVisiblePlacementSelect");
  blankLineBeforeCommentToggle = document.querySelector("#blankLineBeforeCommentToggle");
  logicalOperatorPositionSelect = document.querySelector("#logicalOperatorPositionSelect");
  routeBadge = document.querySelector("#routeBadge");
  statusBadge = document.querySelector("#statusBadge");

  const formatButton = document.querySelector("#formatButton");
  const clearButton = document.querySelector("#clearButton");
  const copyButton = document.querySelector("#copyButton");
  const resetConfigButton = document.querySelector("#resetConfigButton");

  inputEditor = createEditor(document.querySelector("#inputEditor"), {
    route: () => routeFile(filepathInput.value),
    tabWidth: getConfiguredTabWidth,
    onInput: () => {}
  });
  outputEditor = createEditor(document.querySelector("#outputEditor"), {
    readOnly: true,
    route: () => routeFile(filepathInput.value),
    tabWidth: getConfiguredTabWidth
  });
  configEditor = createEditor(document.querySelector("#configEditor"), {
    route: () => "prettier-core",
    tabWidth: getConfiguredTabWidth,
    onInput: () => {
      syncEditorTabSize();
      syncControlsFromConfig();
      formatNow();
    }
  });

  renderSampleSelect();
  resetConfig();
  loadSample("Simple Class");
  updateRouteBadge();

  formatButton.addEventListener("click", formatNow);
  clearButton.addEventListener("click", clearInput);
  copyButton.addEventListener("click", copyOutput);
  filepathInput.addEventListener("input", () => {
    updateRouteBadge();
    inputEditor.render();
    outputEditor.render();
  });
  sampleSelect.addEventListener("change", () => loadSample(sampleSelect.value));
  for (const control of [printWidthInput, tabWidthInput]) {
    control.addEventListener("input", updateConfigFromControls);
  }
  for (const control of [
    trailingCommaSelect,
    useTabsToggle,
    singleQuoteToggle,
    bracketSameLineToggle,
    sortLabelsToggle,
    finalNewlineToggle,
    testVisiblePlacementSelect,
    blankLineBeforeCommentToggle,
    logicalOperatorPositionSelect
  ]) {
    control.addEventListener("change", updateConfigFromControls);
  }
  resetConfigButton.addEventListener("click", () => {
    resetConfig();
    formatNow();
  });
}

function homeTemplate() {
  return `
    <div class="site-shell">
      <header class="site-header">
        <a class="site-brand" href="#top" aria-label="Prettier Plugin Salesforce home">
          <div class="prettier-mark" aria-hidden="true">
            <span class="bg-[#ea5f6f]"></span>
            <span class="bg-[#f7b93e]"></span>
            <span class="bg-[#56b3b4]"></span>
            <span class="bg-[#bf85bf]"></span>
          </div>
          <span>prettier-plugin-salesforce</span>
        </a>
        <nav class="site-nav" aria-label="Primary">
          <a href="#usage">Usage</a>
          <a href="#features">Features</a>
          <a href="#options">Options</a>
          <a href="#audit">Config audit</a>
          <a data-route="playground" href="#playground">Playground</a>
        </nav>
      </header>

      <main id="top">
        <section class="hero-section">
          <div class="hero-copy">
            <p class="eyebrow">Prettier for Salesforce source</p>
            <h1>Format Apex, Salesforce metadata, Visualforce, Aura, and LWC templates with one plugin.</h1>
            <p class="hero-lede">
              Keep Salesforce-owned files on Salesforce-aware parsers while Prettier core and other plugins keep ordinary project files in line.
            </p>
            <div class="hero-actions">
              <a class="primary-button site-button" data-route="playground" href="#playground">Try the playground</a>
              <a class="ghost-button site-button" href="#usage">Read setup</a>
            </div>
          </div>
          <div class="hero-card" aria-label="Install command">
            <div class="terminal-title">
              <span></span><span></span><span></span>
              <strong>install</strong>
            </div>
            <pre><code>pnpm add -D prettier prettier-plugin-salesforce</code></pre>
            <div class="terminal-title">
              <span></span><span></span><span></span>
              <strong>.prettierrc</strong>
            </div>
            <pre><code>{
  "plugins": ["prettier-plugin-salesforce"]
}</code></pre>
          </div>
        </section>

        <section id="usage" class="site-section">
          <div class="section-heading">
            <p class="eyebrow">Use it in a Salesforce project</p>
            <h2>Install, add the plugin, and let file paths pick the parser.</h2>
          </div>
          <div class="step-grid">
            <article class="info-card">
              <span class="step-number">1</span>
              <h3>Install beside Prettier</h3>
              <pre><code>pnpm add -D prettier prettier-plugin-salesforce</code></pre>
            </article>
            <article class="info-card">
              <span class="step-number">2</span>
              <h3>Register the plugin</h3>
              <pre><code>{
  "plugins": ["prettier-plugin-salesforce"]
}</code></pre>
            </article>
            <article class="info-card">
              <span class="step-number">3</span>
              <h3>Format or check your source</h3>
              <pre><code>pnpm prettier --write "force-app/**/*"
pnpm prettier --check "force-app/**/*"</code></pre>
            </article>
          </div>
        </section>

        <section id="features" class="site-section">
          <div class="section-heading">
            <p class="eyebrow">Features</p>
            <h2>Salesforce routes get Salesforce handling. Everything else stays with Prettier.</h2>
          </div>
          <div class="feature-grid">
            <article class="info-card"><h3>Apex formatting</h3><p>Formats classes, triggers, and anonymous Apex scripts.</p></article>
            <article class="info-card"><h3>Metadata XML</h3><p>Handles <code>*-meta.xml</code>, labels, profiles, flows, permission sets, and known metadata suffix files.</p></article>
            <article class="info-card"><h3>Markup support</h3><p>Formats Visualforce, Aura markup, and LWC templates by path.</p></article>
            <article class="info-card"><h3>Path-aware routing</h3><p>Shared extensions such as <code>.html</code>, <code>.xml</code>, and <code>.app</code> route by Salesforce path rules.</p></article>
            <article class="info-card"><h3>Core plugin delegation</h3><p>JS, TS, CSS, JSON, YAML, Markdown, and ordinary HTML can stay with Prettier core or other plugins.</p></article>
            <article class="info-card"><h3>Browser-ready package</h3><p>The playground uses the browser export so formatting can run in the site.</p></article>
          </div>
        </section>

        <section id="options" class="site-section">
          <div class="section-heading">
            <p class="eyebrow">Options</p>
            <h2>Keep the defaults, then change only the Salesforce edges your team cares about.</h2>
          </div>
          <div class="option-table">
            <div><strong>salesforceSortLabelsByFullName</strong><span>Sort CustomLabels blocks by nested fullName.</span></div>
            <div><strong>salesforceFinalNewline</strong><span>Print one trailing newline for Salesforce-formatted files.</span></div>
            <div><strong>salesforceTestVisiblePlacement</strong><span>Put Apex @TestVisible on its own line or keep it inline.</span></div>
            <div><strong>salesforceBlankLineBeforeLineComment</strong><span>Add spacing before standalone Apex line comments.</span></div>
            <div><strong>salesforceLogicalOperatorPosition</strong><span>Choose end-of-line or start-of-line wrapped Apex logical operators.</span></div>
          </div>
        </section>

        <section id="audit" class="site-section cta-section">
          <div>
            <p class="eyebrow">Config audit</p>
            <h2>Find risky Prettier parser overrides before they steal Salesforce files.</h2>
            <p>Run the audit command against a workspace, print JSON for automation, or apply supported safe fixes.</p>
          </div>
          <pre><code>pnpm --filter prettier-plugin-salesforce audit:configs /abs/path/to/workspace
pnpm --filter prettier-plugin-salesforce audit:configs --apply-fixes /abs/path/to/workspace</code></pre>
        </section>
      </main>
    </div>
  `;
}

function playgroundTemplate() {
  return `
    <div class="playground-shell">
      <header class="playground-header">
        <div class="mx-auto flex max-w-[1600px] items-center justify-between gap-5 px-4 py-2.5 sm:px-5">
          <div class="flex min-w-0 items-center gap-3 sm:gap-4">
            <a data-route="home" href="/" class="prettier-mark" aria-label="Back to docs home">
              <span class="bg-[#ea5f6f]"></span>
              <span class="bg-[#f7b93e]"></span>
              <span class="bg-[#56b3b4]"></span>
              <span class="bg-[#bf85bf]"></span>
            </a>
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">prettier-plugin-salesforce</p>
              <h1 class="text-lg font-semibold leading-tight text-white">Salesforce formatting playground</h1>
            </div>
          </div>
          <div class="hidden items-center gap-2 md:flex">
            <span id="statusBadge" class="status-pill">Ready</span>
            <span id="routeBadge" class="status-pill font-mono">route: apex</span>
          </div>
        </div>
      </header>

      <main class="playground-main">
        <section class="workspace min-h-0">
          <div class="control-rail">
            <div class="sample-picker">
              <label class="min-w-0 flex-1">
                <span class="control-label">Example</span>
                <select id="sampleSelect" class="control-input"></select>
              </label>
              <p id="sampleMeta" class="sample-meta"></p>
            </div>
            <input id="filepathInput" type="hidden" value="force-app/main/default/classes/Example.cls" />
            <button id="formatButton" class="primary-button" type="button">Format</button>
          </div>

          <details class="tool-drawer">
            <summary>
              <span>Config</span>
              <span class="summary-note">Prettier and Salesforce options</span>
            </summary>
            <div class="drawer-grid">
              <section class="drawer-section">
                <h2 class="drawer-heading">Prettier</h2>
                <div class="config-control-grid">
                  <label>
                    <span class="control-label">Print width</span>
                    <input id="printWidthInput" class="control-input" type="number" min="20" max="240" step="1" />
                  </label>
                  <label>
                    <span class="control-label">Tab width</span>
                    <input id="tabWidthInput" class="control-input" type="number" min="1" max="12" step="1" />
                  </label>
                  <label>
                    <span class="control-label">Trailing comma</span>
                    <select id="trailingCommaSelect" class="control-input">
                      <option value="none">none</option>
                      <option value="es5">es5</option>
                      <option value="all">all</option>
                    </select>
                  </label>
                  <label class="toggle-pill config-toggle">
                    <input id="useTabsToggle" type="checkbox" />
                    <span>Use tabs</span>
                  </label>
                  <label class="toggle-pill config-toggle">
                    <input id="singleQuoteToggle" type="checkbox" />
                    <span>Single quotes</span>
                  </label>
                  <label class="toggle-pill config-toggle">
                    <input id="bracketSameLineToggle" type="checkbox" />
                    <span>Bracket same line</span>
                  </label>
                </div>
              </section>

              <section class="drawer-section">
                <h2 class="drawer-heading">Salesforce</h2>
                <div class="config-control-grid">
                  <label class="toggle-pill config-toggle config-toggle-wide">
                    <input id="sortLabelsToggle" type="checkbox" />
                    <span>Sort labels by fullName</span>
                  </label>
                  <label class="toggle-pill config-toggle">
                    <input id="finalNewlineToggle" type="checkbox" />
                    <span>Final newline</span>
                  </label>
                  <label class="toggle-pill config-toggle">
                    <input id="blankLineBeforeCommentToggle" type="checkbox" />
                    <span>Blank before // comments</span>
                  </label>
                  <label>
                    <span class="control-label">TestVisible placement</span>
                    <select id="testVisiblePlacementSelect" class="control-input">
                      <option value="own-line">own-line</option>
                      <option value="inline">inline</option>
                    </select>
                  </label>
                  <label>
                    <span class="control-label">Logical operators</span>
                    <select id="logicalOperatorPositionSelect" class="control-input">
                      <option value="end-of-line">end-of-line</option>
                      <option value="start-of-line">start-of-line</option>
                    </select>
                  </label>
                </div>
              </section>

              <section class="drawer-section drawer-section-wide">
                <div class="drawer-heading-row">
                  <h2 class="drawer-heading">Config JSON</h2>
                  <button id="resetConfigButton" class="ghost-button" type="button">Reset</button>
                </div>
                <div class="config-grid">
                  <label>
                    <span class="control-label">Options merged into Prettier</span>
                    <div id="configEditor" class="editor-shell editor-shell-small" data-editor="config"></div>
                  </label>
                  <div class="config-help">
                    <p>Parsed as JSON and passed into <code>prettier.format</code>. The sample path controls parser routing; runtime keys like <code>parser</code>, <code>filepath</code>, and <code>plugins</code> stay under playground control.</p>
                  </div>
                </div>
              </section>
            </div>
          </details>

          <div class="pane-grid min-h-0">
            <section class="code-panel">
              <div class="panel-header">
                <div>
                  <p class="panel-kicker">Source</p>
                  <h2>Input</h2>
                </div>
                <button id="clearButton" class="ghost-button" type="button">Clear</button>
              </div>
              <div id="inputEditor" class="editor-shell" data-editor="input"></div>
            </section>
            <section class="code-panel">
              <div class="panel-header">
                <div>
                  <p class="panel-kicker">Formatted</p>
                  <h2>Output</h2>
                </div>
                <button id="copyButton" class="ghost-button" type="button">Copy</button>
              </div>
              <div id="outputEditor" class="editor-shell" data-editor="output"></div>
            </section>
          </div>

          <pre id="errorPane" class="error-pane" aria-live="polite"></pre>
        </section>
      </main>
    </div>
  `;
}

async function formatNow() {
  const requestId = ++formatRequestId;
  errorPane.textContent = "";
  setStatus("Formatting");
  try {
    const configOptions = applySortLabelsToggle(readUserConfigOptions(), sortLabelsToggle.checked);
    const result = await prettier.format(inputEditor.value, {
      ...configOptions,
      filepath: filepathInput.value,
      plugins: [salesforcePlugin, htmlPlugin, markdownPlugin]
    });
    if (requestId !== formatRequestId) {
      return;
    }
    outputEditor.value = result;
    updateRouteBadge();
    outputEditor.render();
    setStatus("Formatted");
  } catch (error) {
    if (requestId !== formatRequestId) {
      return;
    }
    outputEditor.value = "";
    errorPane.textContent = error instanceof Error ? error.message : String(error);
    outputEditor.render();
    setStatus("Error");
  }
}

function parseConfigOptions() {
  const trimmed = configEditor.value.trim();
  if (trimmed.length === 0) {
    return {};
  }
  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Config JSON must be an object.");
  }
  return parsed;
}

function readUserConfigOptions() {
  return normalizePlaygroundConfigOptions(parseConfigOptions(), defaultConfig);
}

function getConfiguredTabWidth() {
  try {
    return readBoundedInteger(
      Number(readUserConfigOptions().tabWidth),
      defaultConfig.tabWidth,
      configNumberBounds.tabWidth
    );
  } catch {
    return defaultConfig.tabWidth;
  }
}

function syncEditorTabSize() {
  const tabWidth = getConfiguredTabWidth();
  inputEditor.setTabWidth(tabWidth);
  outputEditor.setTabWidth(tabWidth);
  configEditor.setTabWidth(tabWidth);
}

function resetConfig() {
  configEditor.value = JSON.stringify(defaultConfig, null, 2);
  configEditor.render();
  syncEditorTabSize();
  syncControlsFromConfig();
}

function loadSample(label) {
  const sample = samples.find((entry) => entry.label === label);
  if (!sample) {
    return;
  }
  inputEditor.value = sample.text;
  filepathInput.value = sample.filepath;
  sampleSelect.value = sample.label;
  updateSampleMeta(sample);
  inputEditor.render();
  updateRouteBadge();
  formatNow();
}

function syncControlsFromConfig() {
  try {
    const configOptions = readUserConfigOptions();
    printWidthInput.value = String(
      readBoundedInteger(configOptions.printWidth, defaultConfig.printWidth, configNumberBounds.printWidth)
    );
    tabWidthInput.value = String(
      readBoundedInteger(configOptions.tabWidth, defaultConfig.tabWidth, configNumberBounds.tabWidth)
    );
    trailingCommaSelect.value = readTrailingComma(configOptions.trailingComma);
    useTabsToggle.checked = configOptions.useTabs === true;
    singleQuoteToggle.checked = configOptions.singleQuote === true;
    bracketSameLineToggle.checked = configOptions.bracketSameLine === true;
    sortLabelsToggle.checked = readSortLabelsToggle(configOptions);
    finalNewlineToggle.checked = configOptions.salesforceFinalNewline !== false;
    testVisiblePlacementSelect.value = readTestVisiblePlacement(configOptions.salesforceTestVisiblePlacement);
    blankLineBeforeCommentToggle.checked = configOptions.salesforceBlankLineBeforeLineComment === true;
    logicalOperatorPositionSelect.value = readLogicalOperatorPosition(configOptions.salesforceLogicalOperatorPosition);
  } catch {
    return;
  }
}

function updateConfigFromControls() {
  try {
    const nextConfig = applySortLabelsToggle(
      {
        ...readUserConfigOptions(),
        printWidth: readBoundedInteger(Number(printWidthInput.value), defaultConfig.printWidth, configNumberBounds.printWidth),
        tabWidth: readBoundedInteger(Number(tabWidthInput.value), defaultConfig.tabWidth, configNumberBounds.tabWidth),
        useTabs: useTabsToggle.checked,
        singleQuote: singleQuoteToggle.checked,
        bracketSameLine: bracketSameLineToggle.checked,
        trailingComma: readTrailingComma(trailingCommaSelect.value),
        salesforceFinalNewline: finalNewlineToggle.checked,
        salesforceTestVisiblePlacement: readTestVisiblePlacement(testVisiblePlacementSelect.value),
        salesforceBlankLineBeforeLineComment: blankLineBeforeCommentToggle.checked,
        salesforceLogicalOperatorPosition: readLogicalOperatorPosition(logicalOperatorPositionSelect.value)
      },
      sortLabelsToggle.checked
    );
    configEditor.value = JSON.stringify(nextConfig, null, 2);
    configEditor.render();
    syncEditorTabSize();
    formatNow();
  } catch {
    return;
  }
}

function readTrailingComma(value) {
  return readChoice(value, defaultConfig.trailingComma, ["none", "es5", "all"]);
}

function readTestVisiblePlacement(value) {
  return readChoice(value, defaultConfig.salesforceTestVisiblePlacement, ["own-line", "inline"]);
}

function readLogicalOperatorPosition(value) {
  return readChoice(value, defaultConfig.salesforceLogicalOperatorPosition, ["end-of-line", "start-of-line"]);
}

function updateRouteBadge() {
  const route = routeFile(filepathInput.value);
  routeBadge.textContent = `route: ${route}`;
}

function setStatus(label) {
  statusBadge.textContent = label;
}

function clearInput() {
  inputEditor.value = "";
  outputEditor.value = "";
  errorPane.textContent = "";
  inputEditor.render();
  outputEditor.render();
  setStatus("Ready");
}

async function copyOutput() {
  if (!outputEditor.value) {
    return;
  }
  await navigator.clipboard.writeText(outputEditor.value);
  setStatus("Copied");
}

function renderSampleSelect() {
  sampleSelect.textContent = "";
  const groups = new Map();
  for (const sample of samples) {
    if (!groups.has(sample.group)) {
      const group = document.createElement("optgroup");
      group.label = sample.group;
      groups.set(sample.group, group);
      sampleSelect.append(group);
    }
    const option = document.createElement("option");
    option.value = sample.label;
    option.textContent = `${sample.label} (${sample.complexity})`;
    groups.get(sample.group).append(option);
  }
}

function updateSampleMeta(sample) {
  if (!sampleMeta) {
    return;
  }
  sampleMeta.textContent = `${sample.group} / ${sample.complexity} / ${sample.filepath}`;
}

function createEditor(root, options) {
  const gutter = document.createElement("pre");
  const highlight = document.createElement("pre");
  const textarea = document.createElement("textarea");
  const editor = {
    get value() {
      return textarea.value;
    },
    set value(next) {
      textarea.value = next;
    },
    render,
    setTabWidth(next) {
      root.style.setProperty("--editor-tab-size", String(next));
    }
  };

  gutter.className = "editor-gutter";
  highlight.className = "editor-highlight";
  textarea.className = "editor-input";
  textarea.spellcheck = false;
  textarea.readOnly = options.readOnly === true;
  root.append(gutter, createMain(highlight, textarea));

  textarea.addEventListener("input", () => {
    render();
    options.onInput?.();
  });
  textarea.addEventListener("scroll", () => {
    highlight.scrollTop = textarea.scrollTop;
    highlight.scrollLeft = textarea.scrollLeft;
    gutter.scrollTop = textarea.scrollTop;
  });

  function render() {
    const lines = Math.max(1, textarea.value.split(/\r\n|\r|\n/).length);
    gutter.textContent = Array.from({ length: lines }, (_, index) => String(index + 1).padStart(2, " ")).join("\n");
    highlight.innerHTML = `${highlightSource(textarea.value, options.route())}\n`;
  }

  render();
  return editor;
}

function createMain(highlight, textarea) {
  const main = document.createElement("div");
  main.className = "editor-main";
  main.append(highlight, textarea);
  return main;
}
