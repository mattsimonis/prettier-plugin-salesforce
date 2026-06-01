const largeLabelEntries = [
  ["Z_Commerce_Cart_Recovery", "Commerce", "Cart recovery reminder"],
  ["A_Account_Onboarding_Title", "Accounts", "Account onboarding title"],
  ["M_Service_Level_Breach", "Service", "Service level breach notice"],
  ["Q_Invoice_Payment_Reminder", "Billing", "Invoice payment reminder"],
  ["C_Order_Fulfillment_Delay", "Orders", "Order fulfillment delay"],
  ["Y_Return_Window_Expired", "Returns", "Return window expired"],
  ["D_Credit_Check_Required", "Finance", "Credit check required"],
  ["L_Partner_Rebate_Status", "Partners", "Partner rebate status"],
  ["F_Field_Tech_Dispatched", "Service", "Field tech dispatched"],
  ["T_Contract_Renewal_Due", "Contracts", "Contract renewal due"],
  ["E_Entitlement_Review", "Service", "Entitlement review"],
  ["N_Quote_Discount_Approval", "Sales", "Quote discount approval"],
  ["G_Warranty_Claim_Open", "Warranty", "Warranty claim open"],
  ["R_Portal_Profile_Incomplete", "Portal", "Portal profile incomplete"],
  ["H_Shipment_Exception", "Logistics", "Shipment exception"],
  ["V_Subscription_Cancelled", "Subscriptions", "Subscription cancelled"],
  ["I_Case_Escalated", "Support", "Case escalated"],
  ["P_Data_Quality_Warning", "Data", "Data quality warning"],
  ["J_Inventory_Reorder", "Inventory", "Inventory reorder"],
  ["U_Survey_Request", "Customer", "Survey request"],
  ["K_Knowledge_Article_Stale", "Knowledge", "Knowledge article stale"],
  ["S_Approval_Reassigned", "Approvals", "Approval reassigned"],
  ["O_Opportunity_Close_Plan", "Sales", "Opportunity close plan"],
  ["W_Work_Order_Ready", "Service", "Work order ready"],
  ["AA_Billing_Address_Invalid", "Billing", "Billing address invalid"],
  ["X_Community_Welcome", "Community", "Community welcome"],
  ["AB_Usage_Threshold_Reached", "Usage", "Usage threshold reached"],
  ["AC_Security_Review_Needed", "Security", "Security review needed"],
  ["AD_Product_Notice", "Product", "Product notice"],
  ["B_Invoice_Writeoff_Reason", "Billing", "Invoice writeoff reason"]
];

const permissionSetFields = [
  "Invoice__c.Amount__c",
  "Invoice__c.Status__c",
  "Invoice__c.Due_Date__c",
  "Invoice__c.Payment_Terms__c",
  "Payment__c.External_Id__c",
  "Payment__c.Processor_Status__c",
  "Refund__c.Reason__c",
  "Refund__c.Amount__c",
  "Settlement__c.Batch_Number__c",
  "Settlement__c.Reconciled__c",
  "Dispute__c.Opened_Date__c",
  "Dispute__c.Resolution__c"
];

export const extraSamples = [
  {
    group: "Apex",
    label: "Expanded Apex Service",
    complexity: "expanded",
    filepath: "force-app/main/default/classes/SubscriptionRenewalService.cls",
    text: `public with sharing class SubscriptionRenewalService {
public class RenewalRequest {
@AuraEnabled public Id accountId;
@AuraEnabled public Date renewalDate;
@AuraEnabled public Decimal upliftPercent;
}
@AuraEnabled(cacheable=false)
public static Map<Id, Decimal> calculateRenewals(List<RenewalRequest> requests) {
Map<Id, Decimal> totals = new Map<Id, Decimal>();
Set<Id> accountIds = new Set<Id>();
for (RenewalRequest request : requests) {
if (request != null && request.accountId != null) {
accountIds.add(request.accountId);
}
}
for (AggregateResult row : [
SELECT Account__c accountId, SUM(Amount__c) total
FROM Subscription__c
WHERE Account__c IN :accountIds AND Status__c = 'Active'
GROUP BY Account__c
]) {
Id accountId = (Id) row.get('accountId');
Decimal amount = (Decimal) row.get('total');
totals.put(accountId, amount == null ? 0 : amount.setScale(2));
}
for (RenewalRequest request : requests) {
if (request == null || request.accountId == null) {
continue;
}
Decimal base = totals.containsKey(request.accountId) ? totals.get(request.accountId) : 0;
Decimal uplift = request.upliftPercent == null ? 0 : request.upliftPercent;
totals.put(request.accountId, base + (base * uplift / 100));
}
return totals;
}
}`
  },
  {
    group: "Apex",
    label: "Expanded Trigger Handler",
    complexity: "expanded",
    filepath: "force-app/main/default/classes/CaseMilestoneTriggerHandler.cls",
    text: `public without sharing class CaseMilestoneTriggerHandler {
public static void beforeUpdate(List<Case> records, Map<Id, Case> oldById) {
Set<Id> accountIds = new Set<Id>();
for (Case record : records) {
Case oldRecord = oldById.get(record.Id);
if (record.Status != oldRecord.Status && record.AccountId != null) {
accountIds.add(record.AccountId);
}
}
Map<Id, Account> accounts = new Map<Id, Account>([
SELECT Id, SLA__c, Support_Tier__c
FROM Account
WHERE Id IN :accountIds
]);
for (Case record : records) {
Account account = accounts.get(record.AccountId);
if (account == null) {
continue;
}
if (record.Status == 'Escalated' && account.Support_Tier__c == 'Premier') {
record.Priority = 'High';
record.Escalation_Reason__c = 'Premier account escalation';
} else if (record.Status == 'Closed' && record.Resolution_Notes__c == null) {
record.addError('Resolution notes are required before closing the case.');
}
}
}
}`
  },
  {
    group: "Metadata",
    label: "Large Custom Labels",
    complexity: "large",
    filepath: "force-app/main/default/labels/CustomLabels.labels-meta.xml",
    text: createLargeLabelsSample()
  },
  {
    group: "Metadata",
    label: "Large Permission Set",
    complexity: "large",
    filepath: "force-app/main/default/permissionsets/Revenue_Operations.permissionset-meta.xml",
    text: createLargePermissionSetSample()
  },
  {
    group: "Metadata",
    label: "Large Flow",
    complexity: "large",
    filepath: "force-app/main/default/flows/Case_Escalation_Router.flow-meta.xml",
    text: createLargeFlowSample()
  }
];

function createLargeLabelsSample() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<CustomLabels xmlns="http://soap.sforce.com/2006/04/metadata">
${largeLabelEntries.map(formatLabelEntry).join("\n")}
</CustomLabels>`;
}

function formatLabelEntry([fullName, category, description]) {
  return `<labels>
<categories>${category}</categories>
<fullName>${fullName}</fullName>
<language>en_US</language>
<protected>false</protected>
<shortDescription>${description}</shortDescription>
<value>${description} message for the Salesforce operations console.</value>
</labels>`;
}

function createLargePermissionSetSample() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">
<label>Revenue Operations</label>
<description>Access for billing, settlement, refund, and dispute operations.</description>
<hasActivationRequired>false</hasActivationRequired>
<classAccesses><apexClass>InvoiceBatchService</apexClass><enabled>true</enabled></classAccesses>
<classAccesses><apexClass>PaymentRetryController</apexClass><enabled>true</enabled></classAccesses>
${permissionSetFields.map(formatFieldPermission).join("\n")}
<objectPermissions><allowCreate>true</allowCreate><allowDelete>false</allowDelete><allowEdit>true</allowEdit><allowRead>true</allowRead><modifyAllRecords>false</modifyAllRecords><object>Invoice__c</object><viewAllRecords>true</viewAllRecords></objectPermissions>
<objectPermissions><allowCreate>true</allowCreate><allowDelete>false</allowDelete><allowEdit>true</allowEdit><allowRead>true</allowRead><modifyAllRecords>false</modifyAllRecords><object>Payment__c</object><viewAllRecords>true</viewAllRecords></objectPermissions>
<userPermissions><enabled>true</enabled><name>ApiEnabled</name></userPermissions>
<userPermissions><enabled>true</enabled><name>RunReports</name></userPermissions>
</PermissionSet>`;
}

function formatFieldPermission(fieldName) {
  return `<fieldPermissions><editable>true</editable><field>${fieldName}</field><readable>true</readable></fieldPermissions>`;
}

function createLargeFlowSample() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
<apiVersion>61.0</apiVersion>
<description>Routes support cases through entitlement and account health checks.</description>
<interviewLabel>Case Escalation Router {!$Flow.CurrentDateTime}</interviewLabel>
<label>Case Escalation Router</label>
<processType>AutoLaunchedFlow</processType>
<decisions><name>CheckPriority</name><label>Check Priority</label><rules><name>HighPriority</name><conditionLogic>and</conditionLogic><conditions><leftValueReference>$Record.Priority</leftValueReference><operator>EqualTo</operator><rightValue><stringValue>High</stringValue></rightValue></conditions><connector><targetReference>AssignHighTouchQueue</targetReference></connector><label>High Priority</label></rules><defaultConnector><targetReference>CheckEntitlement</targetReference></defaultConnector><defaultConnectorLabel>Standard</defaultConnectorLabel></decisions>
<decisions><name>CheckEntitlement</name><label>Check Entitlement</label><rules><name>PremierEntitlement</name><conditionLogic>and</conditionLogic><conditions><leftValueReference>$Record.Account.Support_Tier__c</leftValueReference><operator>EqualTo</operator><rightValue><stringValue>Premier</stringValue></rightValue></conditions><connector><targetReference>AssignPremierQueue</targetReference></connector><label>Premier Entitlement</label></rules><defaultConnector><targetReference>AssignStandardQueue</targetReference></defaultConnector><defaultConnectorLabel>Standard Entitlement</defaultConnectorLabel></decisions>
<assignments><name>AssignHighTouchQueue</name><label>Assign High Touch Queue</label><assignmentItems><assignToReference>$Record.OwnerId</assignToReference><operator>Assign</operator><value><stringValue>00G000000000001</stringValue></value></assignmentItems><connector><targetReference>MarkRouted</targetReference></connector></assignments>
<assignments><name>AssignPremierQueue</name><label>Assign Premier Queue</label><assignmentItems><assignToReference>$Record.OwnerId</assignToReference><operator>Assign</operator><value><stringValue>00G000000000002</stringValue></value></assignmentItems><connector><targetReference>MarkRouted</targetReference></connector></assignments>
<assignments><name>AssignStandardQueue</name><label>Assign Standard Queue</label><assignmentItems><assignToReference>$Record.OwnerId</assignToReference><operator>Assign</operator><value><stringValue>00G000000000003</stringValue></value></assignmentItems><connector><targetReference>MarkRouted</targetReference></connector></assignments>
<recordUpdates><name>MarkRouted</name><label>Mark Routed</label><inputAssignments><field>Routing_Status__c</field><value><stringValue>Routed</stringValue></value></inputAssignments><inputAssignments><field>Last_Routed_At__c</field><value><elementReference>$Flow.CurrentDateTime</elementReference></value></inputAssignments><object>Case</object></recordUpdates>
<start><connector><targetReference>CheckPriority</targetReference></connector></start>
<status>Draft</status>
</Flow>`;
}
