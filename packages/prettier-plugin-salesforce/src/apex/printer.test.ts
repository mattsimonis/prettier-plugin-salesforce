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
      "public class C {\n  public void run(Boolean flag) {\n    do {\n      work();\n    }\n    // keep tail\n    while (flag);\n  }\n}\n"
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
      "public class C {\n  public void run(Boolean flag) {\n    do {\n      work();\n    } while\n    /* probe */\n    (flag)\n    // keep\n    ;\n  }\n}\n"
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
      "public class Docs {\n  /** class method */\n  public void first() {\n  }\n  /** second method */\n  public void second() {\n  }\n  public class Inner {\n    /** inner property */\n    public String Name {\n      get;\n      set;\n    }\n    /** inner method */\n    public void run() {\n    }\n  }\n}\n"
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
      "/**class doc*/\n@IsTest\nprivate with sharing class DocsAndAnno {\n  /**method doc*/\n  @AuraEnabled(cacheable = true)\n  public static String loadName(Id accountId) {\n    return 'A';\n  }\n  /**prop doc*/\n  @TestVisible\n  private static String token {\n    get;\n    set;\n  }\n}\n"
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
      "/**outer doc*/\n@IsTest\nprivate class OuterDecl {\n  /**inner interface doc*/\n  @TestVisible\n  private interface InnerApi {\n    void run();\n  }\n  /**inner enum doc*/\n  private enum Mode {\n    Fast, Slow\n  }\n  /**inner class doc*/\n  @TestVisible\n  private class InnerWorker {\n    public void exec() {\n      System.debug('x');\n    }\n  }\n}\n"
    );
  });

  it("stacks annotations with ApexDoc before interface methods, enum members, and inner declarations", async () => {
    const source =
      "public class StackedShape {\n  /** inner interface */\n  @TestVisible @Deprecated private interface Runner {\n    /** run doc */\n    @AuraEnabled(cacheable=true) @Deprecated public String run(Integer x);\n  }\n  /** enum doc */\n  private enum Mode {\n    /** fast doc */ @Deprecated FAST('A'),\n    /** slow doc */ @Deprecated SLOW('B'); private final String code; private Mode(String value){code=value;}\n  }\n}\n";
    const first = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const second = await prettier.format(first, { parser: "salesforce-apex", plugins: [plugin] });

    expect(second).toBe(first);
    expect(first).toBe(
      "public class StackedShape {\n  /** inner interface */\n  @TestVisible\n  @Deprecated\n  private interface Runner {\n    /** run doc */\n    @AuraEnabled(cacheable = true)\n    @Deprecated\n    public String run(Integer x);\n  }\n  /** enum doc */\n  private enum Mode {\n    /** fast doc */\n    @Deprecated\n    FAST('A'),\n    /** slow doc */\n    @Deprecated\n    SLOW('B');\n    private final String code;\n    private Mode(String value) {\n      code = value;\n    }\n  }\n}\n"
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
