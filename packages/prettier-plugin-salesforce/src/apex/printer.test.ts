import prettier from "prettier";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import plugin from "../index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const stressAnonymousFixturePath = resolve(__dirname, "../../tests/apex/anonymous-depth/ExecuteAnonymousStress.apex");
const stressDeclarationFixturePath = resolve(
  __dirname,
  "../../tests/apex/declaration-mixed-bodies/DeclarationMixedBodiesStress.cls"
);
const stressCommentDeclarationFixturePath = resolve(
  __dirname,
  "../../tests/apex/declaration-mixed-bodies/DeclarationCommentDeclarationStress.cls"
);
const commentsEdgeMatrixFixturePath = resolve(__dirname, "../../tests/apex/comments/ApexDocEdgeMatrix.cls");
const annotationCommentBoundaryFixturePath = resolve(
  __dirname,
  "../../tests/apex/comments/AnnotationCommentBoundary.cls"
);
const enumSwitchFixturePath = resolve(__dirname, "../../tests/apex/enum-switch/EnumSwitch.cls");
const propertyAccessorBoundaryFixturePath = resolve(
  __dirname,
  "../../tests/apex/properties/PropertyAccessorBoundary.cls"
);
const propertyGlobalAccessorFixturePath = resolve(__dirname, "../../tests/apex/properties/PropertyGlobalAccessor.cls");

describe("apex printer", () => {
  it("is idempotent for representative execute anonymous scripts", async () => {
    const source =
      "// setup values\n" +
      "Integer count=0;\n" +
      "for(Integer i=0;i<3;i++){if(i==1){continue;}count+=i;}\n" +
      "if(count>0){System.debug('count='+count);}else{System.debug('none');}\n";
    const first = await prettier.format(source, { parser: "salesforce-apex-anonymous", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex-anonymous", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toBe(
      "// setup values\nInteger count = 0;\nfor (Integer i = 0; i < 3; i++) {\n  if (i == 1) {\n    continue;\n  }\n  count += i;\n}\nif (count > 0) {\n  System.debug('count='+count);\n} else {\n  System.debug('none');\n}\n"
    );
  });

  it("formats an empty class with spaced braces", async () => {
    const formatted = await prettier.format("public class Empty{}\n", {
      parser: "salesforce-apex",
      plugins: [plugin]
    });

    expect(formatted).toBe("public class Empty {\n}\n");
  });

  it("keeps @TestVisible on its own line by default and supports inline placement", async () => {
    const source = "public class C{@TestVisible public String Name{get;set;}@TestVisible public void run(){}}\n";
    const ownLine = await prettier.format(source, {
      parser: "salesforce-apex",
      plugins: [plugin]
    });
    const inline = await prettier.format(source, {
      parser: "salesforce-apex",
      salesforceTestVisiblePlacement: "inline",
      plugins: [plugin]
    });

    expect(ownLine).toBe("public class C {\n  @TestVisible\n  public String Name { get; set; }\n\n  @TestVisible\n  public void run() {\n  }\n}\n");
    expect(inline).toBe("public class C {\n  @TestVisible public String Name { get; set; }\n\n  @TestVisible\n  public void run() {\n  }\n}\n");
  });

  it("adds a blank line between code and following block docs", async () => {
    const formatted = await prettier.format("public class C{private String value;/** doc */public void run(){}}\n", {
      parser: "salesforce-apex",
      plugins: [plugin]
    });

    expect(formatted).toBe("public class C {\n  private String value;\n\n  /** doc */\n  public void run() {\n  }\n}\n");
  });

  it("can add blank lines before standalone line comments except first comments in a block", async () => {
    const formatted = await prettier.format("public class C{void run(){\n// first\nwork();\n// middle\nother();}}\n", {
      parser: "salesforce-apex",
      salesforceBlankLineBeforeLineComment: true,
      plugins: [plugin]
    });

    expect(formatted).toBe("public class C {\n  void run() {\n    // first\n    work();\n\n    // middle\n    other();\n  }\n}\n");
  });

  it("does not split consecutive standalone line comments with blank lines", async () => {
    const formatted = await prettier.format("public class C{void run(){work();\n// first\n// second\nother();}}\n", {
      parser: "salesforce-apex",
      salesforceBlankLineBeforeLineComment: true,
      plugins: [plugin]
    });

    expect(formatted).toBe("public class C {\n  void run() {\n    work();\n\n    // first\n    // second\n    other();\n  }\n}\n");
  });

  it("does not add a blank line between a block comment and a following line comment", async () => {
    const formatted = await prettier.format(
      "public class C{\n/**\n * @description Determines if a cart payment is accepted.\n * @param cartPayment The cart payment being checked.\n * @return True if the payment is not accepted, false if it is.\n */\n\n// TODO: AMS-6600 - This double negative can be changed.\npublic Boolean isPaymentNotAccepted(){return false;}}\n",
      {
        parser: "salesforce-apex",
        salesforceBlankLineBeforeLineComment: true,
        plugins: [plugin]
      }
    );

    expect(formatted).toBe(
      "public class C {\n  /**\n   * @description Determines if a cart payment is accepted.\n   * @param cartPayment The cart payment being checked.\n   * @return True if the payment is not accepted, false if it is.\n   */\n  // TODO: AMS-6600 - This double negative can be changed.\n  public Boolean isPaymentNotAccepted() {\n    return false;\n  }\n}\n"
    );
  });

  it("keeps static singleton access with the class before wrapping the following method call", async () => {
    const formatted = await prettier.format(
      "public class C{void run(){List<DeferredSchedule__c> newSchedules=DeferredScheduleService.Instance.handleDeferredSchedules(generationResult,oilDeferredScheduleContexts);}}\n",
      {
        parser: "salesforce-apex",
        printWidth: 120,
        plugins: [plugin]
      }
    );

    expect(formatted).toBe(
      "public class C {\n  void run() {\n    List<DeferredSchedule__c> newSchedules = DeferredScheduleService.Instance.handleDeferredSchedules(\n      generationResult,\n      oilDeferredScheduleContexts\n    );\n  }\n}\n"
    );
  });

  it("wraps singleton method-call arguments after keeping the receiver and method on the first line", async () => {
    const formatted = await prettier.format(
      "public class C{void run(){ScheduleService.Instance.reparentSchedules(cartIdToSubmit,getIdFromSObject(convertedOrder),submissionResult.result);BusinessEventsService.Instance.handleBusinessEventByLabel(ORDER_FULLY_UPSERTED_BUSINESS_EVENT,convertedOrder.Id);}}\n",
      {
        parser: "salesforce-apex",
        printWidth: 100,
        plugins: [plugin]
      }
    );

    expect(formatted).toBe(
      "public class C {\n  void run() {\n    ScheduleService.Instance.reparentSchedules(\n      cartIdToSubmit,\n      getIdFromSObject(convertedOrder),\n      submissionResult.result\n    );\n    BusinessEventsService.Instance.handleBusinessEventByLabel(\n      ORDER_FULLY_UPSERTED_BUSINESS_EVENT,\n      convertedOrder.Id\n    );\n  }\n}\n"
    );
  });

  it("wraps singleton calls with one long argument at the opening paren", async () => {
    const formatted = await prettier.format(
      "public class C{void run(Exception ex){submissionResult.result.addErrorMessage('An error occurred while generating transactions: '+ex.getMessage());}}\n",
      {
        parser: "salesforce-apex",
        printWidth: 100,
        plugins: [plugin]
      }
    );

    expect(formatted).toBe(
      "public class C {\n  void run(Exception ex) {\n    submissionResult.result.addErrorMessage(\n      'An error occurred while generating transactions: ' + ex.getMessage()\n    );\n  }\n}\n"
    );
  });

  it("keeps existing left-hand side and singleton access together for assignment chains", async () => {
    const formatted = await prettier.format(
      "public class C{void run(){result.deferredOrderItemLines=DeferredScheduleService.Instance.setOrderItemLineDeferredScheduleIds(oilDeferredScheduleContexts.values());}}\n",
      {
        parser: "salesforce-apex",
        printWidth: 120,
        plugins: [plugin]
      }
    );

    expect(formatted).toBe(
      "public class C {\n  void run() {\n    result.deferredOrderItemLines = DeferredScheduleService.Instance\n      .setOrderItemLineDeferredScheduleIds(oilDeferredScheduleContexts.values());\n  }\n}\n"
    );
  });

  it("aligns wrapped list initializer call suffixes without inserting a space before index access", async () => {
    const formatted = await prettier.format(
      "public class C{Object run(){return this.generate(new List<TransactionGenerator.TransactionGenerationRequest>{request})[0];}}\n",
      {
        parser: "salesforce-apex",
        printWidth: 80,
        plugins: [plugin]
      }
    );

    expect(formatted).toBe(
      "public class C {\n  Object run() {\n    return this.generate(\n      new List<TransactionGenerator.TransactionGenerationRequest> {\n        request\n      }\n    )[0];\n  }\n}\n"
    );
  });

  it("wraps long method parameter lists when printWidth is exceeded", async () => {
    const formatted = await prettier.format(
      "public class Width{public void run(String firstName,String secondName,String thirdName,String fourthName){System.debug(firstName);}}\n",
      {
        parser: "salesforce-apex",
        printWidth: 60,
        plugins: [plugin]
      }
    );

    expect(formatted).toBe(
      "public class Width {\n  public void run(\n    String firstName,\n    String secondName,\n    String thirdName,\n    String fourthName\n  ) {\n    System.debug(firstName);\n  }\n}\n"
    );
  });

  it("keeps semicolons attached to wrapped closing parens", async () => {
    const formatted = await prettier.format(
      "public class Width{public void run(){System.debug(firstArgumentValue,secondArgumentValue,thirdArgumentValue,fourthArgumentValue);}}\n",
      {
        parser: "salesforce-apex",
        printWidth: 60,
        plugins: [plugin]
      }
    );

    expect(formatted).toContain("    );\n");
    expect(formatted).not.toContain(") ;");
  });

  it("wraps method call arguments at the opening paren when an argument is a small set initializer", async () => {
    const formatted = await prettier.format(
      "public class Width{public void run(){List<SObject> providers=ProviderService.getProvidersByExternalId(new Set<String>{deaScan.providerId},mapping);}}\n",
      {
        parser: "salesforce-apex",
        printWidth: 80,
        plugins: [plugin]
      }
    );

    expect(formatted).toBe(
      "public class Width {\n  public void run() {\n    List<SObject> providers = ProviderService.getProvidersByExternalId(\n      new Set<String> { deaScan.providerId },\n      mapping\n    );\n  }\n}\n"
    );
  });

  it("wraps assigned constructor field arguments without splitting simple field access values", async () => {
    const formatted = await prettier.format(
      "public class Width{public void run(CartPayment__c cartPaymentToConvert, Id billToId){Payment__c payment=new Payment__c(PaymentAmount__c=cartPaymentToConvert.PaymentAmount__c*-1,Note__c=cartPaymentToConvert.Note__c,EntityPaymentMethod__c=cartPaymentToConvert.EntityPaymentMethod__c,Payer__c=billToId,IsCredit__c=true);}}\n",
      {
        parser: "salesforce-apex",
        printWidth: 100,
        plugins: [plugin]
      }
    );

    expect(formatted).toContain(
      "    Payment__c payment = new Payment__c(\n      PaymentAmount__c = cartPaymentToConvert.PaymentAmount__c * -1,\n      Note__c = cartPaymentToConvert.Note__c,\n      EntityPaymentMethod__c = cartPaymentToConvert.EntityPaymentMethod__c,\n      Payer__c = billToId,\n      IsCredit__c = true\n    );\n"
    );
  });

  it("wraps long fluent chains before dots when printWidth is exceeded", async () => {
    const formatted = await prettier.format(
      "public class Width{public void run(){Account result=builder.withCustomerName('Acme').withBillingCountry('US').withDefaultOwner(UserInfo.getUserId()).save();}}\n",
      {
        parser: "salesforce-apex",
        printWidth: 70,
        plugins: [plugin]
      }
    );

    expect(formatted).toBe(
      "public class Width {\n  public void run() {\n    Account result = builder\n      .withCustomerName('Acme')\n      .withBillingCountry('US')\n      .withDefaultOwner(UserInfo.getUserId())\n      .save();\n  }\n}\n"
    );
  });

  it("wraps long binary expressions with logical operators at the end of lines by default", async () => {
    const formatted = await prettier.format(
      "public class Width{public void run(){Boolean allowed=firstCondition && secondCondition && thirdCondition && fourthCondition;}}\n",
      {
        parser: "salesforce-apex",
        printWidth: 70,
        plugins: [plugin]
      }
    );

    expect(formatted).toBe(
      "public class Width {\n  public void run() {\n    Boolean allowed = firstCondition &&\n      secondCondition &&\n      thirdCondition &&\n      fourthCondition;\n  }\n}\n"
    );
  });

  it("can wrap long binary expressions with logical operators at the start of lines", async () => {
    const formatted = await prettier.format(
      "public class Width{public void run(){Boolean allowed=firstCondition && secondCondition && thirdCondition && fourthCondition;}}\n",
      {
        parser: "salesforce-apex",
        printWidth: 70,
        salesforceLogicalOperatorPosition: "start-of-line",
        plugins: [plugin]
      }
    );

    expect(formatted).toBe(
      "public class Width {\n  public void run() {\n    Boolean allowed = firstCondition\n      && secondCondition\n      && thirdCondition\n      && fourthCondition;\n  }\n}\n"
    );
  });

  it("keeps comparison clauses whole and expands parenthesized return disjunctions", async () => {
    const formatted = await prettier.format(
      "public class Width{Boolean run(CartItem__c cartItemToConvert){return cartItemToConvert != null && cartItemToConvert.OrderItem__c != null && (hasAddressChanged(cartItemToConvert) || cartItemToConvert.Customer__c != cartItemToConvert.OrderItem__r.Customer__c || cartItemToConvert.PriceClass__c != cartItemToConvert.OrderItem__r.PriceClass__c || cartItemToConvert.Recurring__c != cartItemToConvert.OrderItem__r.Recurring__c || cartItemToConvert.TotalShipping__c != cartItemToConvert.OrderItem__r.TotalShipping__c || cartItemToConvert.TotalTax__c != cartItemToConvert.OrderItem__r.TotalTax__c || cartItemToConvert.SalesTax__c != cartItemToConvert.OrderItem__r.SalesTax__c || this.isCartItemRecurringDataAdjusted(cartItemToConvert));}}\n",
      {
        parser: "salesforce-apex",
        printWidth: 120,
        plugins: [plugin]
      }
    );

    expect(formatted).toContain(
      "    return cartItemToConvert != null && cartItemToConvert.OrderItem__c != null &&\n      (hasAddressChanged(cartItemToConvert) ||\n        cartItemToConvert.Customer__c != cartItemToConvert.OrderItem__r.Customer__c ||\n        cartItemToConvert.PriceClass__c != cartItemToConvert.OrderItem__r.PriceClass__c ||\n        cartItemToConvert.Recurring__c != cartItemToConvert.OrderItem__r.Recurring__c ||\n        cartItemToConvert.TotalShipping__c != cartItemToConvert.OrderItem__r.TotalShipping__c ||\n        cartItemToConvert.TotalTax__c != cartItemToConvert.OrderItem__r.TotalTax__c ||\n        cartItemToConvert.SalesTax__c != cartItemToConvert.OrderItem__r.SalesTax__c ||\n        this.isCartItemRecurringDataAdjusted(cartItemToConvert));\n"
    );
  });

  it("wraps long if conditions with the first condition segment on its own line", async () => {
    const formatted = await prettier.format(
      "public class Width{public void run(){if(!orderItemByCartItemId.isEmpty()&&(hasNewPurchaseCartItems||hasOrderAdjustments||AdjustmentVersionService.Instance.isEnabled())){work();}}}\n",
      {
        parser: "salesforce-apex",
        printWidth: 100,
        plugins: [plugin]
      }
    );

    expect(formatted).toContain(
      "    if (\n      !orderItemByCartItemId.isEmpty() &&\n      (hasNewPurchaseCartItems ||\n        hasOrderAdjustments ||\n        AdjustmentVersionService.Instance.isEnabled())\n    ) {\n"
    );
  });

  it("wraps ternary assignments without splitting simple field and constant access", async () => {
    const formatted = await prettier.format(
      "public class Width{public void run(Cart__c cartToSubmit){Id cartEntityId=cartToSubmit.AdjustmentEntity__c==null?cartToSubmit.Entity2__c:cartToSubmit.AdjustmentEntity__c;String batchSource=SystemUtil.isCommunityUser()||SystemUtil.isGuestUser()?Constant.BATCH_SOURCE_SELF_SERVICE:Constant.BATCH_SOURCE_SALESFORCE;}}\n",
      {
        parser: "salesforce-apex",
        printWidth: 110,
        plugins: [plugin]
      }
    );

    expect(formatted).toContain(
      "    Id cartEntityId = cartToSubmit.AdjustmentEntity__c == null ? cartToSubmit.Entity2__c :\n      cartToSubmit.AdjustmentEntity__c;\n"
    );
    const roomy = await prettier.format(
      "public class Width{public void run(){String batchSource=SystemUtil.isCommunityUser()||SystemUtil.isGuestUser()?Constant.BATCH_SOURCE_SELF_SERVICE:Constant.BATCH_SOURCE_SALESFORCE;}}\n",
      {
        parser: "salesforce-apex",
        printWidth: 140,
        plugins: [plugin]
      }
    );

    expect(roomy).toContain(
      "    String batchSource = SystemUtil.isCommunityUser() || SystemUtil.isGuestUser() ? Constant.BATCH_SOURCE_SELF_SERVICE :\n      Constant.BATCH_SOURCE_SALESFORCE;\n"
    );
  });

  it("keeps field and constant access whole when wrapping logical returns", async () => {
    const formatted = await prettier.format(
      "public class Width{Boolean active(CartItem__c cartItem){return cartItem!=null&&cartItem.OrderItem__c!=null&&cartItem.OrderItem__r.Status__c==Constant.ORDER_ITEM_STATUS_ACTIVE;}Boolean sameLine(CartItemLine__c cartItemLine,OrderItemLine__c orderItemLine,Map<Id,OrderItemLine__c> cartItemLineToOrderItemLineMap){return cartItemLine.OrderItemLine__c==orderItemLine.Id||(cartItemLineToOrderItemLineMap.containsKey(cartItemLine.Id)&&cartItemLineToOrderItemLineMap.get(cartItemLine.Id).Id==orderItemLine.Id);}}\n",
      {
        parser: "salesforce-apex",
        printWidth: 45,
        salesforceLogicalOperatorPosition: "start-of-line",
        plugins: [plugin]
      }
    );

    expect(formatted).toContain(
      "    return cartItem != null\n      && cartItem.OrderItem__c != null\n      && cartItem.OrderItem__r.Status__c == Constant.ORDER_ITEM_STATUS_ACTIVE;\n"
    );
    expect(formatted).toContain(
      "    return cartItemLine.OrderItemLine__c == orderItemLine.Id\n      || (cartItemLineToOrderItemLineMap.containsKey(cartItemLine.Id)\n        && cartItemLineToOrderItemLineMap.get(cartItemLine.Id).Id == orderItemLine.Id);\n"
    );
  });

  it("wraps return parenthesized logical groups without removing the return space", async () => {
    const formatted = await prettier.format(
      "public class Width{Boolean run(CartPayment__c cartPayment){return (cartPayment.EntityPaymentMethod__r.PaymentMethod__r.IsPayment__c==false&&cartPayment.EntityPaymentMethod__r.PaymentMethod__r.RecordType.Name!=Constant.PAYMENT_METHOD_TYPE_TRANSFER)||cartPayment.Payment__c!=null;}}\n",
      {
        parser: "salesforce-apex",
        printWidth: 120,
        plugins: [plugin]
      }
    );

    expect(formatted).toContain(
      "    return (\n      cartPayment.EntityPaymentMethod__r.PaymentMethod__r.IsPayment__c == false &&\n      cartPayment.EntityPaymentMethod__r.PaymentMethod__r.RecordType.Name != Constant.PAYMENT_METHOD_TYPE_TRANSFER\n    ) || cartPayment.Payment__c != null;\n"
    );
  });

  it("wraps large real-world Apex constructs at the configured printWidth", async () => {
    const source =
      "public class Width{public void run(){if(((String) currentVerification?.get('trigger') == 'Monitor' && (eventType == 'VerificationCompleted' || eventType == 'DatasetScanCompleted')) || ((String) parsedReqBody?.get('status') == 'Active' && eventType == 'DatasetScanMatchesChanged')){work();}for(Sanction_Exclusion_Scan__c oldScan:SanctionExclusionScansSelector.newInstance().selectLatestScansByProviderVuidAndType(providerVuid,datasetType)){work();}List<Sanction_Exclusion_Scan__c> existingScans=[SELECT Id FROM Sanction_Exclusion_Scan__c WHERE Verifiable_External_Id__c=:scanToUpsert.Verifiable_External_Id__c ORDER BY VerifiedAt__c DESC LIMIT 1];throw new webhook.WebhookRecordNotFoundException('Unable to locate Provider Credentialing Event: ['+reportModel.credentialingRequestId+']');ActionRequest__c fileRequest=new ActionRequest__c(ActionName__c=constants.ACTIONREQUEST_ACTION_NAME_GETPROFILEFILE,Payload__c=JSON.serialize(new Map<String,String>{'filePath'=>importModel.profile.profileDocumentFilePath,'importId'=>importModel.id}));when 'Sam','OigFugitives','OigExclusions','OfacSdn','OfacConsolidated','StateSanctionsAndExclusions','CmsPreclusion'{work();}}}\n";
    const formatted = await prettier.format(source, {
      parser: "salesforce-apex",
      printWidth: 120,
      plugins: [plugin]
    });

    const longLines = formatted.split("\n").filter((line) => line.length > 120);
    expect(longLines).toEqual([]);
  });

  it("removes odd interior spaces around member access and generic type punctuation", async () => {
    const formatted = await prettier.format(
      "public class Spaces{public void run(){List < String > names=new List < String >();Map < String , Integer > ages=new Map < String , Integer >{'Ann'=>32};System . debug(names);}}\n",
      {
        parser: "salesforce-apex",
        plugins: [plugin]
      }
    );

    expect(formatted).toBe(
      "public class Spaces {\n  public void run() {\n    List<String> names = new List<String>();\n    Map<String, Integer> ages = new Map<String, Integer> { 'Ann' => 32 };\n    System.debug(names);\n  }\n}\n"
    );
  });

  it("removes odd generic type spaces in enhanced for-loop headers", async () => {
    const formatted = await prettier.format(
      "public class Spaces{public void run(Map<Id,List<CartItemLine__c>> couponCartItemLinesByCartItemId){for(List<CartItemLine__c> couponCartItemLines:couponCartItemLinesByCartItemId.values()){cartItemLines.addAll(couponCartItemLines);}}}\n",
      {
        parser: "salesforce-apex",
        plugins: [plugin]
      }
    );

    expect(formatted).toContain(
      "    for (List<CartItemLine__c> couponCartItemLines : couponCartItemLinesByCartItemId.values()) {\n"
    );
    expect(formatted).not.toContain("List < CartItemLine__c >");
  });

  it("preserves deliberate blank lines between statements", async () => {
    const source =
      "public class Sections{public void run(){TransactionGenerator.TransactionGenerationRequest request=new TransactionGenerator.TransactionGenerationRequest();\n\nrequest.Name='A';}}\n";
    const formatted = await prettier.format(source, {
      parser: "salesforce-apex",
      plugins: [plugin]
    });
    const second = await prettier.format(formatted, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(formatted);
    expect(formatted).toContain(
      "    TransactionGenerator.TransactionGenerationRequest request = new TransactionGenerator.TransactionGenerationRequest();\n\n    request.Name = 'A';\n"
    );
  });

  it("preserves leading file header comments before declarations", async () => {
    const source = "// Copyright Example\n/* package note */\npublic class Demo{}\n";
    const formatted = await prettier.format(source, {
      parser: "salesforce-apex",
      plugins: [plugin]
    });

    expect(formatted).toBe("// Copyright Example\n/* package note */\npublic class Demo {\n}\n");
  });

  it("keeps for-loop headers on one line and formats else blocks", async () => {
    const formatted = await prettier.format(
      "public class Loop{public void run(){for(Integer i=0;i<3;i++){if(i==1){continue;}else{System.debug(i);}}}}\n",
      { parser: "salesforce-apex", plugins: [plugin] }
    );

    expect(formatted).toBe(
      "public class Loop {\n  public void run() {\n    for (Integer i = 0; i < 3; i++) {\n      if (i == 1) {\n        continue;\n      } else {\n        System.debug(i);\n      }\n    }\n  }\n}\n"
    );
  });

  it("keeps simple get/set properties on one line", async () => {
    const formatted = await prettier.format("public class Property{public String HelloWorld{get;set;}}\n", {
      parser: "salesforce-apex",
      plugins: [plugin]
    });

    expect(formatted).toBe("public class Property {\n  public String HelloWorld { get; set; }\n}\n");
  });

  it("keeps trailing line comments attached to their code", async () => {
    const formatted = await prettier.format(
      "public class ConstructorComment{public ConstructorComment(){this(exampleRecord1,test12344);// this calls the other constructor\n}}\n",
      {
        parser: "salesforce-apex",
        plugins: [plugin]
      }
    );

    expect(formatted).toContain("    this(exampleRecord1, test12344); // this calls the other constructor\n");
  });

  it("keeps annotated properties split from annotations with blank lines between members", async () => {
    const source =
      "/**\n" +
      " * DTO sample doc\n" +
      " */\n" +
      "public class FacilitySample{\n" +
      "@AuraEnabled\n" +
      "public Id seRecordId{get;set;}\n" +
      "@AuraEnabled\n" +
      "public String seType{get;set;}\n" +
      "// Constructor from FacilitySE__c\n" +
      "public FacilitySample(FacilitySE__c facilitySE){}\n" +
      "/**\n" +
      " * Static method to convert rows\n" +
      " */\n" +
      "public static List<FacilitySample> fromRows(List<FacilitySE__c> rows){return new List<FacilitySample>();}\n" +
      "private static Datetime getScanVerifiedAt(Sanction_Exclusion_Scan__c scan){return scan.Started__c;}\n" +
      "}\n";
    const formatted = await prettier.format(source, {
      parser: "salesforce-apex",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "/**\n * DTO sample doc\n */\npublic class FacilitySample {\n  @AuraEnabled\n  public Id seRecordId { get; set; }\n\n  @AuraEnabled\n  public String seType { get; set; }\n\n  // Constructor from FacilitySE__c\n  public FacilitySample(FacilitySE__c facilitySE) {\n  }\n\n  /**\n   * Static method to convert rows\n   */\n  public static List<FacilitySample> fromRows(List<FacilitySE__c> rows) {\n    return new List<FacilitySample>();\n  }\n\n  private static Datetime getScanVerifiedAt(Sanction_Exclusion_Scan__c scan) {\n    return scan.Started__c;\n  }\n}\n"
    );
  });

  it("does not split semicolons that live inside paren tokens", async () => {
    const formatted = await prettier.format(
      "public class Query{public void run(){Database.query('select Id from Account where Name = \\'A;B\\'');for(Integer i=0;i<2;i++){System.debug(i);}}}\n",
      { parser: "salesforce-apex", plugins: [plugin] }
    );

    expect(formatted).toBe(
      "public class Query {\n  public void run() {\n    Database.query('select Id from Account where Name = \\'A;B\\'');\n    for (Integer i = 0; i < 2; i++) {\n      System.debug(i);\n    }\n  }\n}\n"
    );
  });

  it("keeps SOSL search-group braces from opening Apex blocks", async () => {
    const source =
      "public class SearchBrace{public static List<List<SObject>> run(){return [FIND {Acme*} IN ALL FIELDS RETURNING Account(Id,Name)];}}\n";
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toBe(
      "public class SearchBrace {\n  public static List<List<SObject>> run() {\n    return [FIND {Acme*} IN ALL FIELDS RETURNING Account(Id, Name)];\n  }\n}\n"
    );
  });

  it("keeps else on its own line when an inline block comment sits after block close", async () => {
    const formatted = await prettier.format(
      "public class C{public void run(){if(true){work();}/* else is in comment */else{other();}}}\n",
      { parser: "salesforce-apex", plugins: [plugin] }
    );

    expect(formatted).toBe(
      "public class C {\n  public void run() {\n    if (true) {\n      work();\n    }\n    /* else is in comment */\n    else {\n      other();\n    }\n  }\n}\n"
    );
  });

  it("keeps else on its own line when a multi-line block comment sits between block close and else", async () => {
    const source =
      "public class C{public void run(Boolean flag){if(flag){work();}/* annotate\n" +
      " * keep this note\n" +
      " */else{other();}}}\n";
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toBe(
      "public class C {\n  public void run(Boolean flag) {\n    if (flag) {\n      work();\n    }\n    /* annotate\n    * keep this note\n    */\n    else {\n      other();\n    }\n  }\n}\n"
    );
  });

  it("keeps do-while tails as code when a line comment sits between block close and while", async () => {
    const formatted = await prettier.format(
      "public class C{public void run(Boolean flag){do{work();}// keep tail\nwhile(flag);}}\n",
      { parser: "salesforce-apex", plugins: [plugin] }
    );

    expect(formatted).toBe(
      "public class C {\n  public void run(Boolean flag) {\n    do {\n      work();\n    } // keep tail\n    while (flag);\n  }\n}\n"
    );
  });

  it("joins do-while tails when condition strings contain closing parens", async () => {
    const formatted = await prettier.format("public class C{public void run(){do{work();}while(text==')');}}\n", {
      parser: "salesforce-apex",
      plugins: [plugin]
    });

    expect(formatted).toBe(
      "public class C {\n  public void run() {\n    do {\n      work();\n    } while (text == ')');\n  }\n}\n"
    );
  });

  it("joins do-while tails when comments sit between while, condition, and semicolon", async () => {
    const formatted = await prettier.format(
      "public class C{public void run(Boolean flag){do{work();}while/* probe */(flag)// keep\n;}}\n",
      { parser: "salesforce-apex", plugins: [plugin] }
    );

    expect(formatted).toBe(
      "public class C {\n  public void run(Boolean flag) {\n    do {\n      work();\n    } while\n    /* probe */\n    (flag) // keep\n    ;\n  }\n}\n"
    );
  });

  it("does not treat identifier prefixes as control-flow join keywords after block close", async () => {
    const formatted = await prettier.format(
      "public class C{public void run(Boolean flag){if(flag){work();}elseLog();try{work();}catchAll();do{work();}whileCount++;}}\n",
      { parser: "salesforce-apex", plugins: [plugin] }
    );

    expect(formatted).toBe(
      "public class C {\n  public void run(Boolean flag) {\n    if (flag) {\n      work();\n    }\n    elseLog();\n    try {\n      work();\n    }\n    catchAll();\n    do {\n      work();\n    }\n    whileCount++;\n  }\n}\n"
    );
  });

  it("is idempotent for representative class documents", async () => {
    const source =
      "public class ReportRunner{public void run(){Integer count=0;for(Integer i=0;i<2;i++){count+=i;}if(count>0){System.debug(count);}else{System.debug(0);}}}\n";
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toBe(
      "public class ReportRunner {\n  public void run() {\n    Integer count = 0;\n    for (Integer i = 0; i < 2; i++) {\n      count += i;\n    }\n    if (count > 0) {\n      System.debug(count);\n    } else {\n      System.debug(0);\n    }\n  }\n}\n"
    );
  });

  it("is idempotent for representative trigger documents", async () => {
    const source =
      "trigger WidgetTrigger on Widget__c(before insert,after update){for(Widget__c row:Trigger.new){if(row.Name!=null){System.debug(row.Name);}else{System.debug('missing');}}}\n";
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toBe(
      "trigger WidgetTrigger on Widget__c(before insert, after update) {\n  for (Widget__c row : Trigger.new) {\n    if (row.Name != null) {\n      System.debug(row.Name);\n    } else {\n      System.debug('missing');\n    }\n  }\n}\n"
    );
  });

  it("keeps stable line breaks for mixed control, dml, and query statements", async () => {
    const source =
      "public class StableKinds{public void run(Account input){if(input!=null){Account first=[SELECT Id FROM Account LIMIT 1];insert input;System.debug(first.Id);}else{return;}}}\n";
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toBe(
      "public class StableKinds {\n  public void run(Account input) {\n    if (input != null) {\n      Account first = [SELECT Id FROM Account LIMIT 1];\n      insert input;\n      System.debug(first.Id);\n    } else {\n      return;\n    }\n  }\n}\n"
    );
  });

  it("keeps stable formatting for chained-call and assignment-update statements", async () => {
    const source =
      "public class ChainAndUpdate{public void run(Account a){a.Count__c+=1;a.Score__c++;a.clone(false).put('Name','x');a.getSObjectType().getDescribe().getName();}}\n";
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toBe(
      "public class ChainAndUpdate {\n  public void run(Account a) {\n    a.Count__c += 1;\n    a.Score__c++;\n    a.clone(false).put('Name', 'x');\n    a.getSObjectType().getDescribe().getName();\n  }\n}\n"
    );
  });

  it("stays idempotent across if/for/while/switch/try method constructs", async () => {
    const source =
      "public class ControlBlocks{public void run(Boolean flag,List<Account> rows){if(flag){for(Account row:rows){System.debug(row.Id);}}while(flag){break;}switch on rows.size(){when 0{System.debug('none');}when else{System.debug('many');}}try{upsert rows;}catch(Exception ex){System.debug(ex.getMessage());}finally{System.debug('done');}}}\n";
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toContain("if (flag) {");
    expect(first).toContain("for (Account row : rows) {");
    expect(first).toContain("while (flag) {");
    expect(first).toContain("switch on rows.size() {");
    expect(first).toContain("try {");
    expect(first).toContain("} catch (Exception ex) {");
    expect(first).toContain("} finally {");
  });

  it("keeps comment/string content intact while spacing operators", async () => {
    const source =
      "public class CommentsSafe{public void run(){String url='http://x//y?x=1';// keep==tight\nif(url!=null){/* keep += and == inside */System.debug(url);}}}\n";
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toContain("String url = 'http://x//y?x=1';");
    expect(first).toContain("// keep==tight");
    expect(first).toContain("/* keep += and == inside */");
    expect(first).toContain("if (url != null) {");
  });

  it("adds spacing around arithmetic operators outside strings and comments", async () => {
    const source =
      "public class ArithmeticSpacing{public Decimal run(Decimal a,Decimal b){String text='a+b';// keep a+b\nreturn a+b-c*d/e%f;}}\n";
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toContain("String text = 'a+b';");
    expect(first).toContain("// keep a+b");
    expect(first).toContain("return a + b - c * d / e % f;");
  });

  it("keeps ApexDoc attached to declarations and inner members with stable blank lines", async () => {
    const source =
      "public class Docs{\n/** class method */\npublic void first(){}\n\n/** second method */\npublic void second(){}\n\npublic class Inner{\n/** inner property */\npublic String Name{get;set;}\n/** inner method */\npublic void run(){}}\n}\n";
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toBe(
      "public class Docs {\n  /** class method */\n  public void first() {\n  }\n\n  /** second method */\n  public void second() {\n  }\n\n  public class Inner {\n    /** inner property */\n    public String Name { get; set; }\n\n    /** inner method */\n    public void run() {\n    }\n  }\n}\n"
    );
  });

  it("keeps switch/when and try-catch-finally block layout consistent in nested control paths", async () => {
    const source =
      "public class Layout{public void run(Integer i,List<Account> rows){switch on i{when 0,1{if(rows.isEmpty()){return;}else{System.debug(rows[0].Id);}}when else{try{for(Account row:rows){upsert row;}}catch(Exception ex){System.debug(ex.getMessage());}finally{System.debug('done');}}}}}\n";
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toBe(
      "public class Layout {\n  public void run(Integer i, List<Account> rows) {\n    switch on i {\n      when 0, 1 {\n        if (rows.isEmpty()) {\n          return;\n        } else {\n          System.debug(rows[0].Id);\n        }\n      }\n      when else {\n        try {\n          for (Account row : rows) {\n            upsert row;\n          }\n        } catch (Exception ex) {\n          System.debug(ex.getMessage());\n        } finally {\n          System.debug('done');\n        }\n      }\n    }\n  }\n}\n"
    );
  });

  it("adds spacing around multi-catch type separators", async () => {
    const source =
      "public class MultiCatchSpacing{public void run(){try{work();}catch(Exception|DmlException ex){System.debug(ex.getMessage());}}}\n";
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toContain("} catch (Exception | DmlException ex) {");
  });

  it("keeps catch/finally on their own lines when block comments sit after closing braces", async () => {
    const source =
      "public class BoundaryTrivia{public void run(){try{work();}/* hold boundary */catch(Exception ex){System.debug(ex.getMessage());}/* hold final */finally{System.debug('done');}}}\n";
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toBe(
      "public class BoundaryTrivia {\n  public void run() {\n    try {\n      work();\n    }\n    /* hold boundary */\n    catch (Exception ex) {\n      System.debug(ex.getMessage());\n    }\n    /* hold final */\n    finally {\n      System.debug('done');\n    }\n  }\n}\n"
    );
  });

  it("keeps do/while joined and nested layout stable across switch/try/for blocks", async () => {
    const source =
      "public class DoWhileLayout{public void run(Boolean runNow,List<Account> rows){switch on rows.size(){when 0{try{for(Account row:rows){do{row.Count__c+=1;}while(runNow&&row.Count__c<3);}}catch(Exception ex){System.debug(ex.getMessage());}finally{System.debug('done');}}when else{return;}}}}\n";
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toBe(
      "public class DoWhileLayout {\n  public void run(Boolean runNow, List<Account> rows) {\n    switch on rows.size() {\n      when 0 {\n        try {\n          for (Account row : rows) {\n            do {\n              row.Count__c += 1;\n            } while (runNow && row.Count__c < 3);\n          }\n        } catch (Exception ex) {\n          System.debug(ex.getMessage());\n        } finally {\n          System.debug('done');\n        }\n      }\n      when else {\n        return;\n      }\n    }\n  }\n}\n"
    );
  });

  it("keeps ApexDoc, annotations, and modifiers aligned for declarations", async () => {
    const source =
      "/**class doc*/\n@IsTest\nprivate with sharing class DocsAndAnno{\n/**method doc*/\n@AuraEnabled(cacheable=true)\npublic static String loadName(Id accountId){return 'A';}\n/**prop doc*/\n@TestVisible\nprivate static String token{get;set;}\n}\n";
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toBe(
      "/**class doc*/\n@IsTest\nprivate with sharing class DocsAndAnno {\n  /**method doc*/\n  @AuraEnabled(cacheable = true)\n  public static String loadName(Id accountId) {\n    return 'A';\n  }\n\n  /**prop doc*/\n  @TestVisible\n  private static String token { get; set; }\n}\n"
    );
  });

  it("keeps annotated query field declarations stable with attached comments", async () => {
    const source =
      "public class AnnotatedQueryLayout{\n" +
      "// attached annotation + query declaration\n" +
      "@TestVisible\n" +
      "private static Account cached=[SELECT Id,Name FROM Account LIMIT 1];\n" +
      "}\n";
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toBe(
      "public class AnnotatedQueryLayout {\n  // attached annotation + query declaration\n  @TestVisible\n  private static Account cached = [SELECT Id, Name FROM Account LIMIT 1];\n}\n"
    );
  });

  it("keeps interface/enum/inner-type declarations stable with ApexDoc and annotations", async () => {
    const source =
      "/**outer doc*/\n@IsTest\nprivate class OuterDecl{\n/**inner interface doc*/\n@TestVisible\nprivate interface InnerApi{void run();}\n/**inner enum doc*/\nprivate enum Mode{Fast,Slow}\n/**inner class doc*/\n@TestVisible\nprivate class InnerWorker{public void exec(){System.debug('x');}}\n}\n";
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toBe(
      "/**outer doc*/\n@IsTest\nprivate class OuterDecl {\n  /**inner interface doc*/\n  @TestVisible\n  private interface InnerApi {\n    void run();\n  }\n\n  /**inner enum doc*/\n  private enum Mode {\n    Fast, Slow\n  }\n\n  /**inner class doc*/\n  @TestVisible\n  private class InnerWorker {\n    public void exec() {\n      System.debug('x');\n    }\n  }\n}\n"
    );
  });

  it("stacks annotations with ApexDoc before interface methods, enum members, and inner declarations", async () => {
    const source =
      "public class StackedShape {\n  /** inner interface */\n  @TestVisible @Deprecated private interface Runner {\n    /** run doc */\n    @AuraEnabled(cacheable=true) @Deprecated public String run(Integer x);\n  }\n  /** enum doc */\n  private enum Mode {\n    /** fast doc */ @Deprecated FAST('A'),\n    /** slow doc */ @Deprecated SLOW('B'); private final String code; private Mode(String value){code=value;}\n  }\n}\n";
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toBe(
      "public class StackedShape {\n  /** inner interface */\n  @TestVisible\n  @Deprecated\n  private interface Runner {\n    /** run doc */\n    @AuraEnabled(cacheable = true)\n    @Deprecated\n    public String run(Integer x);\n  }\n\n  /** enum doc */\n  private enum Mode {\n    /** fast doc */\n    @Deprecated\n    FAST('A'),\n    /** slow doc */\n    @Deprecated\n    SLOW('B');\n    private final String code;\n    private Mode(String value) {\n      code = value;\n    }\n  }\n}\n"
    );
  });

  it("is idempotent for larger anonymous apex stress fixtures", async () => {
    const source = readFileSync(stressAnonymousFixturePath, "utf8");
    const first = await prettier.format(source, { parser: "salesforce-apex-anonymous", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex-anonymous", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toContain("for (Integer i = 0; i < rows.size(); i++) {");
    expect(first).toContain("switch on nonNullCount {");
    expect(first).toContain("} catch (DmlException ex) {");
    expect(first).toContain("upsert rows;");
  });

  it("is idempotent for larger declaration-mix stress fixtures", async () => {
    const source = readFileSync(stressDeclarationFixturePath, "utf8");
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toContain("public interface Runner {");
    expect(first).toContain("public enum Mode {");
    expect(first).toContain("@AuraEnabled(cacheable = true)");
    expect(first).toContain("private class WorkerImpl implements Runner {");
  });

  it("is idempotent for comment-heavy declaration stress fixtures with mixed inner declarations", async () => {
    const source = readFileSync(stressCommentDeclarationFixturePath, "utf8");
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toContain("/** Outer stress doc. */");
    expect(first).toContain("// Interface line comment.");
    expect(first).toContain("private interface Runner {");
    expect(first).toContain("private enum Mode {");
    expect(first).toContain("private class WorkerImpl implements Runner {");
    expect(first).toContain("@AuraEnabled(cacheable = true)");
    expect(first).toContain("switch on total {");
    expect(first).toContain("} catch (Exception ex) {");
    expect(first).toContain("} finally {");
  });

  it("keeps ApexDoc and adjacent line comments stable around annotations and modifiers", async () => {
    const source = readFileSync(commentsEdgeMatrixFixturePath, "utf8");
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toContain("/** class doc: kept exact */");
    expect(first).toContain("// line comment before method doc");
    expect(first).toContain("/** method one doc: keep == and += */");
    expect(first).toContain("// line comment between doc and annotation");
    expect(first).toContain("// line comment above property doc");
    expect(first).toContain("// line comment before inner method doc");
    expect(first).toContain("@AuraEnabled(cacheable = true)");
    expect(first).toContain("private static String token {");
  });

  it("keeps annotation argument comments with ')' from disturbing method-body formatting", async () => {
    const source = readFileSync(annotationCommentBoundaryFixturePath, "utf8");
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toContain("@AuraEnabled(");
    expect(first).toContain("/* annotation note: keep this ) and ; untouched */");
    expect(first).toContain("Account row = [SELECT Id, Name FROM Account LIMIT 1];");
    expect(first).toContain("return row;");
  });

  it("keeps enum constants, accessor comments, and enum-local switch blocks stable", async () => {
    const source = readFileSync(enumSwitchFixturePath, "utf8");
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toContain("public enum WorkMode {");
    expect(first).toContain("@Deprecated");
    expect(first).toContain("/** active mode */");
    expect(first).toContain("public Integer rank() {");
    expect(first).toContain("switch on this {");
    expect(first).toContain("when ACTIVE {");
    expect(first).toContain("when PAUSED {");
    expect(first).toContain("when else {");
  });

  it("keeps property accessor nested blocks, query strings, and comments stable", async () => {
    const source = readFileSync(propertyAccessorBoundaryFixturePath, "utf8");
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toContain("get {");
    expect(first).toContain("private set {");
    expect(first).toContain("// query in accessor body");
    expect(first).toContain("cached = [SELECT Id, Name FROM Account WHERE Name = 'A;B' LIMIT 1];");
  });

  it("keeps global accessor visibility and accessor-body query/control flow stable", async () => {
    const source = readFileSync(propertyGlobalAccessorFixturePath, "utf8");
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toContain("global get {");
    expect(first).toContain("global set {");
    expect(first).toContain("cached = [SELECT Id, Name FROM Account WHERE Id = :value LIMIT 1];");
    expect(first).toContain("return cached;");
  });
});
