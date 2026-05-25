import "./styles.css";
import * as prettier from "prettier/standalone";
import * as htmlPlugin from "prettier/plugins/html";
import * as markdownPlugin from "prettier/plugins/markdown";
import salesforcePlugin, { routeFile } from "prettier-plugin-salesforce/browser";
import {
  applySortLabelsToggle,
  configNumberBounds,
  normalizePlaygroundConfigOptions,
  readBoundedInteger,
  readSortLabelsToggle
} from "./config-options.js";
import { highlightSource } from "./highlight.js";

const defaultConfig = {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  singleQuote: false,
  bracketSameLine: false,
  trailingComma: "none",
  salesforceSortLabelsByFullName: false
};

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
    complexity: "complex",
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
    complexity: "complex",
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
    complexity: "complex",
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
    complexity: "complex",
    filepath: "force-app/main/default/profiles/Standard.profile-meta.xml",
    text: `<?xml version="1.0" encoding="UTF-8"?>
<Profile xmlns="http://soap.sforce.com/2006/04/metadata">
<custom>false</custom>
<fieldPermissions><editable>false</editable><field>Invoice__c.Status__c</field><readable>true</readable></fieldPermissions>
<layoutAssignments><layout>Invoice__c-Invoice Layout</layout><recordType>Invoice__c.Standard</recordType></layoutAssignments>
<objectPermissions><allowCreate>true</allowCreate><allowDelete>false</allowDelete><allowEdit>true</allowEdit><allowRead>true</allowRead><modifyAllRecords>false</modifyAllRecords><object>Invoice__c</object><viewAllRecords>false</viewAllRecords></objectPermissions>
<userPermissions><enabled>true</enabled><name>ViewSetup</name></userPermissions>
</Profile>`
  }
];

const errorPane = document.querySelector("#errorPane");
const filepathInput = document.querySelector("#filepathInput");
const sampleSelect = document.querySelector("#sampleSelect");
const printWidthInput = document.querySelector("#printWidthInput");
const tabWidthInput = document.querySelector("#tabWidthInput");
const trailingCommaSelect = document.querySelector("#trailingCommaSelect");
const useTabsToggle = document.querySelector("#useTabsToggle");
const singleQuoteToggle = document.querySelector("#singleQuoteToggle");
const bracketSameLineToggle = document.querySelector("#bracketSameLineToggle");
const sortLabelsToggle = document.querySelector("#sortLabelsToggle");
const routeBadge = document.querySelector("#routeBadge");
const statusBadge = document.querySelector("#statusBadge");
const formatButton = document.querySelector("#formatButton");
const clearButton = document.querySelector("#clearButton");
const copyButton = document.querySelector("#copyButton");
const resetConfigButton = document.querySelector("#resetConfigButton");
let formatRequestId = 0;
const inputEditor = createEditor(document.querySelector("#inputEditor"), {
  route: () => routeFile(filepathInput.value),
  tabWidth: getConfiguredTabWidth,
  onInput: () => {}
});
const outputEditor = createEditor(document.querySelector("#outputEditor"), {
  readOnly: true,
  route: () => routeFile(filepathInput.value),
  tabWidth: getConfiguredTabWidth
});
const configEditor = createEditor(document.querySelector("#configEditor"), {
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
for (const control of [
  printWidthInput,
  tabWidthInput
]) {
  control.addEventListener("input", updateConfigFromControls);
}
for (const control of [
  trailingCommaSelect,
  useTabsToggle,
  singleQuoteToggle,
  bracketSameLineToggle,
  sortLabelsToggle
]) {
  control.addEventListener("change", updateConfigFromControls);
}
resetConfigButton.addEventListener("click", () => {
  resetConfig();
  formatNow();
});

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
        trailingComma: readTrailingComma(trailingCommaSelect.value)
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
  return ["none", "es5", "all"].includes(value) ? value : defaultConfig.trailingComma;
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
  for (const sample of samples) {
    const option = document.createElement("option");
    option.value = sample.label;
    option.textContent = `${sample.group} / ${sample.label}`;
    sampleSelect.append(option);
  }
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
