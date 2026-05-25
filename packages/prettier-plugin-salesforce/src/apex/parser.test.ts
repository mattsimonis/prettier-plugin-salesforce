import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";
import { parseApex } from "./parser.js";
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
const propertyAccessorBoundaryFixturePath = resolve(
  __dirname,
  "../../tests/apex/properties/PropertyAccessorBoundary.cls"
);
const propertyGlobalAccessorFixturePath = resolve(__dirname, "../../tests/apex/properties/PropertyGlobalAccessor.cls");

describe("parseApex", () => {
  it("keeps anonymous mode as a statement block and classifies top-level spans", () => {
    const source =
      "// run once\n" +
      "Integer count = 0;\n" +
      "if (count == 0) {\n" +
      "  count += 1;\n" +
      "} else {\n" +
      "  count--;\n" +
      "}\n" +
      "System.debug(count);\n";
    const doc = parseApex(source, { anonymous: true });
    const block = doc.root.children[0];
    const statementSpans = (block?.children ?? []).filter((node) => node.kind === "statement_span");
    const byText = new Map(statementSpans.map((node) => [node.text, node.statementKind]));

    expect(doc.mode).toBe("anonymous");
    expect(doc.root.children).toHaveLength(1);
    expect(block?.kind).toBe("statement_block");
    expect(byText.get("Integer count = 0;") ?? byText.get("Integer count=0;")).toBe("declaration");
    expect(byText.get("if (count == 0) {") ?? byText.get("if (count == 0){")).toBe("if-block");
    expect(byText.get("System.debug(count);")).toBe("plain-call");
  });

  it("keeps anonymous mode stable when class-like tokens appear in strings and comments", () => {
    const source =
      "System.debug('public class Phantom { }');\n" +
      "// trigger Ghost on Account (before insert) {}\n" +
      "Integer i = 1;\n";
    const doc = parseApex(source, { anonymous: true });
    const block = doc.root.children[0];
    const statementSpans = (block?.children ?? []).filter((node) => node.kind === "statement_span");

    expect(doc.mode).toBe("anonymous");
    expect(doc.root.children).toHaveLength(1);
    expect(block?.kind).toBe("statement_block");
    const spanText = statementSpans.map((node) => node.text);
    expect(spanText).toContain("System.debug('public class Phantom { }');");
    expect(spanText.some((text) => text.includes("Integer i = 1;") || text.includes("Integer i=1;"))).toBe(true);
  });

  it("parses a minimal class into a document", () => {
    const doc = parseApex("public class Hello {}\n");
    expect(doc.kind).toBe("apex-document");
    expect(doc.root.kind).toBe("source_file");
    expect(doc.diagnostics).toEqual([]);
  });

  it("does not treat comment markers inside strings as comments", () => {
    const doc = parseApex("public class Hello { String value = 'http://x/*nope*/'; }\n");
    expect(doc.comments).toHaveLength(0);
    expect(doc.tokens.some((token) => token.kind === "block-comment")).toBe(false);
  });

  it("reports unmatched parens and brackets", () => {
    const doc = parseApex("public class Hello { void run(){ List<String> a = new List<String>(); if ((a[0 != null) { } }");
    const codes = doc.diagnostics.map((item) => item.code);
    expect(codes).toContain("APEX_PAREN_UNMATCHED_OPEN");
    expect(codes).toContain("APEX_BRACKET_UNMATCHED_OPEN");
  });

  it("emits token ranges for comments and delimiters", () => {
    const source = "public class Hello {\n  // line\n  /* block */\n  void run(){ List<String> v = new List<String>(); String first = v[0]; }\n}\n";
    const doc = parseApex(source);
    const kinds = doc.tokens.map((token) => token.kind);

    expect(kinds).toContain("line-comment");
    expect(kinds).toContain("block-comment");
    expect(kinds).toContain("open-brace");
    expect(kinds).toContain("close-brace");
    expect(kinds).toContain("open-paren");
    expect(kinds).toContain("close-paren");
    expect(kinds).toContain("open-bracket");
    expect(kinds).toContain("close-bracket");

    for (const token of doc.tokens) {
      expect(token.range.start.offset).toBeGreaterThanOrEqual(0);
      expect(token.range.end.offset).toBeGreaterThan(token.range.start.offset);
      expect(source.slice(token.range.start.offset, token.range.end.offset)).toBe(token.text);
    }
  });

  it("extracts top-level declaration and block-span nodes for classes", () => {
    const source =
      "public class Hello {\n" +
      "  public void run() {\n" +
      "    if (true) {\n" +
      "      System.debug('x');\n" +
      "    }\n" +
      "  }\n" +
      "}\n";
    const doc = parseApex(source);
    const declaration = doc.root.children.find((node) => node.kind === "class_declaration");

    expect(declaration).toBeDefined();
    expect(declaration?.name).toBe("Hello");
    expect(declaration?.range.start.offset).toBe(source.indexOf("public class Hello"));
    expect(declaration?.range.end.offset).toBe(source.lastIndexOf("}") + 1);
    expect(declaration?.children.filter((node) => node.kind === "block_span").length).toBe(3);
  });

  it("extracts method-level and statement-level spans under class declarations", () => {
    const source =
      "public class WidgetService {\n" +
      "  public void run(Integer limitSize) {\n" +
      "    Integer count = 0;\n" +
      "    for (Integer i = 0; i < limitSize; i++) {\n" +
      "      count += i;\n" +
      "    }\n" +
      "    System.debug(count);\n" +
      "  }\n" +
      "}\n";
    const doc = parseApex(source);
    const declaration = doc.root.children.find((node) => node.kind === "class_declaration");
    const method = declaration?.children.find((node) => node.kind === "method_declaration");
    const statements = method?.children.filter((node) => node.kind === "statement_span") ?? [];

    expect(method).toBeDefined();
    expect(method?.name).toBe("run");
    expect(statements.length).toBeGreaterThanOrEqual(2);
    expect(statements.map((node) => node.text)).toContain("Integer count = 0;");
    expect(statements.some((node) => node.text.includes("System.debug(count);"))).toBe(true);
  });

  it("classifies statement spans by heuristic kind", () => {
    const source =
      "public class KindProbe {\n" +
      "  public void run(Account a) {\n" +
      "    Account first = [SELECT Id FROM Account LIMIT 1];\n" +
      "    insert a;\n" +
      "    a.Name = 'x';\n" +
      "    a.Count__c += 1;\n" +
      "    a.Score__c++;\n" +
      "    Database.query('SELECT Id FROM Account');\n" +
      "    upsert(a);\n" +
      "    System.debug(first.Id);\n" +
      "    first.clone(false).put('Name', 'x');\n" +
      "    return;\n" +
      "  }\n" +
      "}\n";
    const doc = parseApex(source);
    const declaration = doc.root.children.find((node) => node.kind === "class_declaration");
    const method = declaration?.children.find((node) => node.kind === "method_declaration");
    const statements = method?.children.filter((node) => node.kind === "statement_span") ?? [];
    const byText = new Map(statements.map((node) => [node.text, node.statementKind]));

    expect(byText.get("Account first = [SELECT Id FROM Account LIMIT 1];")).toBe("declaration");
    expect(byText.get("insert a;")).toBe("dml");
    expect(byText.get("a.Name = 'x';")).toBe("assignment");
    expect(byText.get("a.Count__c += 1;")).toBe("assignment-update");
    expect(byText.get("a.Score__c++;")).toBe("assignment-update");
    expect(byText.get("Database.query('SELECT Id FROM Account');")).toBe("query-call");
    expect(byText.get("upsert(a);")).toBe("dml-call");
    expect(byText.get("System.debug(first.Id);")).toBe("plain-call");
    expect(byText.get("first.clone(false).put('Name', 'x');")).toBe("chained-call");
    expect(byText.get("return;")).toBe("return");
  });

  it("keeps SOSL search-group braces inside the return statement span", () => {
    const source =
      "public class SoslBraceProbe {\n" +
      "  public static List<List<SObject>> run() {\n" +
      "    return [FIND {Acme*} IN ALL FIELDS RETURNING Account(Id, Name)];\n" +
      "  }\n" +
      "}\n";
    const doc = parseApex(source);
    const declaration = doc.root.children.find((node) => node.kind === "class_declaration");
    const method = declaration?.children.find((node) => node.kind === "method_declaration");
    const statements = method?.children.filter((node) => node.kind === "statement_span") ?? [];

    expect(statements).toHaveLength(1);
    expect(statements[0]?.statementKind).toBe("return");
    expect(statements[0]?.text).toBe("return [FIND {Acme*} IN ALL FIELDS RETURNING Account(Id, Name)];");
  });

  it("classifies query assignments after leading comments", () => {
    const source =
      "public class QueryCommentProbe {\n" +
      "  public void run(List<Id> ids) {\n" +
      "    // bind the first requested id\n" +
      "    Account first = [SELECT Id FROM Account WHERE Id = :ids[0] LIMIT 1];\n" +
      "    /* refresh after setup */\n" +
      "    first = [SELECT Id FROM Account WHERE Id = :first.Id LIMIT 1];\n" +
      "  }\n" +
      "}\n";
    const doc = parseApex(source);
    const declaration = doc.root.children.find((node) => node.kind === "class_declaration");
    const method = declaration?.children.find((node) => node.kind === "method_declaration");
    const statements = method?.children.filter((node) => node.kind === "statement_span") ?? [];
    const byText = new Map(statements.map((node) => [node.text, node.statementKind]));

    expect(byText.get("Account first = [SELECT Id FROM Account WHERE Id = :ids[0] LIMIT 1];")).toBe("declaration");
    expect(byText.get("first = [SELECT Id FROM Account WHERE Id = :first.Id LIMIT 1];")).toBe("assignment");
    expect(statements.some((node) => node.text.startsWith("// bind"))).toBe(false);
    expect(statements.some((node) => node.text.startsWith("/* refresh"))).toBe(false);
  });

  it("classifies annotated declaration queries without pulling annotation/comment trivia into spans", () => {
    const source =
      "public class AnnotatedQueryProbe {\n" +
      "  // attached annotation + query declaration\n" +
      "  @TestVisible\n" +
      "  private static Account cached = [SELECT Id FROM Account LIMIT 1];\n" +
      "}\n";
    const doc = parseApex(source);
    const declaration = doc.root.children.find((node) => node.kind === "class_declaration");
    const spans = declaration?.children.filter((node) => node.kind === "statement_span") ?? [];
    const byText = new Map(spans.map((node) => [node.text, node.statementKind]));

    expect(byText.get("private static Account cached = [SELECT Id FROM Account LIMIT 1];")).toBe("declaration");
    expect(spans.some((node) => node.text.startsWith("@TestVisible"))).toBe(false);
    expect(spans.some((node) => node.text.startsWith("// attached"))).toBe(false);
  });

  it("keeps annotation comments with closing parens out of statement spans", () => {
    const source =
      "public class AnnotationCommentProbe {\n" +
      "  @AuraEnabled(\n" +
      "    cacheable=true /* comment has ) and ; to confuse scanners: ) ; */\n" +
      "  )\n" +
      "  public static Account loadOne() {\n" +
      "    Account row = [SELECT Id FROM Account LIMIT 1];\n" +
      "    return row;\n" +
      "  }\n" +
      "}\n";
    const doc = parseApex(source);
    const declaration = doc.root.children.find((node) => node.kind === "class_declaration");
    const method = declaration?.children.find((node) => node.kind === "method_declaration");
    const spans = method?.children.filter((node) => node.kind === "statement_span") ?? [];
    const byText = new Map(spans.map((node) => [node.text, node.statementKind]));

    expect(byText.get("Account row = [SELECT Id FROM Account LIMIT 1];")).toBe("declaration");
    expect(byText.get("return row;")).toBe("return");
    expect(spans.some((node) => node.text.startsWith("@AuraEnabled"))).toBe(false);
    expect(spans.some((node) => node.text.includes("to confuse scanners"))).toBe(false);
  });

  it("classifies control-block statement spans by kind", () => {
    const source =
      "public class ControlProbe {\n" +
      "  public void run(Boolean flag, List<Account> rows) {\n" +
      "    if (flag) { System.debug('if'); }\n" +
      "    for (Account row : rows) { System.debug(row.Id); }\n" +
      "    while (flag) { break; }\n" +
      "    switch on rows.size() { when 0,1 { System.debug('few'); } when else { System.debug('many'); } }\n" +
      "    try { upsert rows; } catch (Exception ex) { System.debug(ex.getMessage()); } finally { System.debug('done'); }\n" +
      "  }\n" +
      "}\n";
    const doc = parseApex(source);
    const declaration = doc.root.children.find((node) => node.kind === "class_declaration");
    const method = declaration?.children.find((node) => node.kind === "method_declaration");
    const statements = method?.children.filter((node) => node.kind === "statement_span") ?? [];
    const byKind = new Set(statements.map((node) => node.statementKind));

    expect(byKind.has("if-block")).toBe(true);
    expect(byKind.has("for-block")).toBe(true);
    expect(byKind.has("while-block")).toBe(true);
    expect(byKind.has("switch-block")).toBe(true);
    expect(byKind.has("when-block")).toBe(true);
    expect(byKind.has("try-block")).toBe(true);
    expect(byKind.has("catch-block")).toBe(true);
    expect(byKind.has("finally-block")).toBe(true);
  });

  it("classifies catch headers that include multiple exception types", () => {
    const source =
      "public class CatchProbe {\n" +
      "  public void run() {\n" +
      "    try { work(); }\n" +
      "    catch (Exception|DmlException ex) { System.debug(ex.getMessage()); }\n" +
      "  }\n" +
      "}\n";
    const doc = parseApex(source);
    const declaration = doc.root.children.find((node) => node.kind === "class_declaration");
    const method = declaration?.children.find((node) => node.kind === "method_declaration");
    const catches = (method?.children ?? []).filter((node) => node.kind === "statement_span" && node.statementKind === "catch-block");

    expect(catches).toHaveLength(1);
    expect(catches[0]?.text).toContain("catch (Exception|DmlException ex) {");
  });

  it("classifies deeply mixed nested control spans including do/while tails", () => {
    const source =
      "public class DeepControlProbe {\n" +
      "  public void run(Boolean runNow, List<Account> rows) {\n" +
      "    for (Integer i = 0; i < rows.size(); i++) {\n" +
      "      switch on i {\n" +
      "        when 0, 1 {\n" +
      "          try {\n" +
      "            do {\n" +
      "              if (runNow) {\n" +
      "                update rows[i];\n" +
      "              }\n" +
      "            } while (runNow);\n" +
      "          } catch (Exception ex) {\n" +
      "            System.debug(ex.getMessage());\n" +
      "          } finally {\n" +
      "            System.debug('done');\n" +
      "          }\n" +
      "        }\n" +
      "        when else {\n" +
      "          while (runNow) {\n" +
      "            break;\n" +
      "          }\n" +
      "        }\n" +
      "      }\n" +
      "    }\n" +
      "  }\n" +
      "}\n";
    const doc = parseApex(source);
    const declaration = doc.root.children.find((node) => node.kind === "class_declaration");
    const method = declaration?.children.find((node) => node.kind === "method_declaration");
    const kinds = new Set((method?.children ?? []).map((node) => node.statementKind));

    expect(kinds.has("for-block")).toBe(true);
    expect(kinds.has("switch-block")).toBe(true);
    expect(kinds.has("when-block")).toBe(true);
    expect(kinds.has("try-block")).toBe(true);
    expect(kinds.has("do-block")).toBe(true);
    expect(kinds.has("if-block")).toBe(true);
    expect(kinds.has("catch-block")).toBe(true);
    expect(kinds.has("finally-block")).toBe(true);
    expect(kinds.has("while-block")).toBe(true);
  });

  it("keeps anonymous classification stable for larger stress fixtures", () => {
    const source = readFileSync(stressAnonymousFixturePath, "utf8");
    const doc = parseApex(source, { anonymous: true });
    const block = doc.root.children[0];
    const spans = (block?.children ?? []).filter((node) => node.kind === "statement_span");
    const kinds = new Set(spans.map((node) => node.statementKind));

    expect(doc.mode).toBe("anonymous");
    expect(doc.root.children).toHaveLength(1);
    expect(block?.kind).toBe("statement_block");
    expect(spans.length).toBeGreaterThan(12);
    expect(kinds.has("declaration")).toBe(true);
    expect(kinds.has("for-block")).toBe(true);
    expect(kinds.has("if-block")).toBe(true);
    expect(kinds.has("switch-block")).toBe(true);
    expect(kinds.has("when-block")).toBe(true);
    expect(kinds.has("try-block")).toBe(true);
    expect(kinds.has("catch-block")).toBe(true);
    expect(kinds.has("finally-block")).toBe(true);
    expect(kinds.has("plain-call")).toBe(true);
  });

  it("extracts declaration and method spans from larger mixed declaration fixtures", () => {
    const source = readFileSync(stressDeclarationFixturePath, "utf8");
    const doc = parseApex(source);
    const classNode = doc.root.children.find((node) => node.kind === "class_declaration");
    const classKinds = new Set((classNode?.children ?? []).map((node) => node.kind));
    const summarizeMethod = classNode?.children.find((node) => node.kind === "method_declaration" && node.name === "summarize");
    const summarizeKinds = new Set((summarizeMethod?.children ?? []).map((node) => node.statementKind));

    expect(doc.mode).toBe("class-or-trigger");
    expect(classNode).toBeDefined();
    expect(classNode?.name).toBe("DeclarationMixedBodiesStress");
    expect(classKinds.has("interface_declaration")).toBe(true);
    expect(classKinds.has("enum_declaration")).toBe(true);
    expect(classKinds.has("class_declaration")).toBe(true);
    expect(classKinds.has("method_declaration")).toBe(true);
    expect(summarizeMethod).toBeDefined();
    expect(summarizeKinds.has("if-block")).toBe(true);
    expect(summarizeKinds.has("for-block")).toBe(true);
    expect(summarizeKinds.has("return")).toBe(true);
  });

  it("extracts trigger declaration nodes from real trigger snippets", () => {
    const source =
      "trigger WidgetTrigger on Widget__c (before insert, after update) {\n" +
      "  if (Trigger.isBefore) {\n" +
      "    System.debug('before');\n" +
      "  }\n" +
      "}\n";
    const doc = parseApex(source);
    const declaration = doc.root.children.find((node) => node.kind === "trigger_declaration");

    expect(declaration).toBeDefined();
    expect(declaration?.name).toBe("WidgetTrigger");
    expect(declaration?.children.some((node) => node.kind === "block_span")).toBe(true);
  });

  it("extracts interface and enum declarations at top level", () => {
    const source =
      "public interface Runnable {\n" +
      "  void run();\n" +
      "}\n" +
      "public enum Priority {\n" +
      "  Low,\n" +
      "  High\n" +
      "}\n";
    const doc = parseApex(source);
    const interfaceNode = doc.root.children.find((node) => node.kind === "interface_declaration");
    const enumNode = doc.root.children.find((node) => node.kind === "enum_declaration");

    expect(interfaceNode).toBeDefined();
    expect(interfaceNode?.name).toBe("Runnable");
    expect(enumNode).toBeDefined();
    expect(enumNode?.name).toBe("Priority");
  });

  it("extracts inner class, interface, and enum declaration nodes under outer class", () => {
    const source =
      "public class Outer {\n" +
      "  @TestVisible\n" +
      "  private class InnerClass {\n" +
      "    public void run() {}\n" +
      "  }\n" +
      "  private interface InnerInterface {\n" +
      "    void ping();\n" +
      "  }\n" +
      "  private enum InnerState {\n" +
      "    Warm,\n" +
      "    Cold\n" +
      "  }\n" +
      "}\n";
    const doc = parseApex(source);
    const outer = doc.root.children.find((node) => node.kind === "class_declaration" && node.name === "Outer");
    const innerKinds = (outer?.children ?? []).filter((node) => node.kind.endsWith("_declaration")).map((node) => node.kind);
    const innerNames = new Set((outer?.children ?? []).filter((node) => node.kind.endsWith("_declaration")).map((node) => node.name));

    expect(innerKinds).toContain("class_declaration");
    expect(innerKinds).toContain("interface_declaration");
    expect(innerKinds).toContain("enum_declaration");
    expect(innerNames.has("InnerClass")).toBe(true);
    expect(innerNames.has("InnerInterface")).toBe(true);
    expect(innerNames.has("InnerState")).toBe(true);
  });

  it("classifies interface body members and mixed inner declarations", () => {
    const source =
      "public class Outer {\n" +
      "  public interface Worker {\n" +
      "    void run();\n" +
      "    Integer size();\n" +
      "    class NestedInInterface {\n" +
      "      public void ping() { System.debug('x'); }\n" +
      "    }\n" +
      "  }\n" +
      "}\n";
    const doc = parseApex(source);
    const outer = doc.root.children.find((node) => node.kind === "class_declaration" && node.name === "Outer");
    const worker = outer?.children.find((node) => node.kind === "interface_declaration" && node.name === "Worker");
    const signatures = (worker?.children ?? []).filter((node) => node.kind === "statement_span");
    const signatureKinds = new Set(signatures.map((node) => node.statementKind));
    const nested = worker?.children.find((node) => node.kind === "class_declaration" && node.name === "NestedInInterface");

    expect(signatureKinds.has("declaration")).toBe(true);
    expect(signatures.map((node) => node.text)).toContain("void run();");
    expect(signatures.map((node) => node.text)).toContain("Integer size();");
    expect(nested).toBeDefined();
    expect(nested?.children.some((node) => node.kind === "method_declaration")).toBe(true);
  });

  it("classifies enum body constants and preserves enum method declarations", () => {
    const source =
      "public enum Priority {\n" +
      "  Low,\n" +
      "  High,\n" +
      "  Critical;\n" +
      "  public Integer rank() {\n" +
      "    return 1;\n" +
      "  }\n" +
      "}\n";
    const doc = parseApex(source);
    const priority = doc.root.children.find((node) => node.kind === "enum_declaration" && node.name === "Priority");
    const constants = (priority?.children ?? []).filter((node) => node.kind === "statement_span" && node.statementKind === "enum-constant");
    const method = (priority?.children ?? []).find((node) => node.kind === "method_declaration");

    expect(constants.map((node) => node.text)).toEqual(["Low,", "High,", "Critical;"]);
    expect(method).toBeDefined();
    expect(method?.name).toBe("rank");
  });

  it("classifies switch/when spans inside enum methods while keeping annotated constants as enum-constant spans", () => {
    const source =
      "public enum WorkMode {\n" +
      "  /** active mode */\n" +
      "  @Deprecated\n" +
      "  ACTIVE('A'),\n" +
      "  // paused mode\n" +
      "  PAUSED('P');\n" +
      "  private final String code;\n" +
      "  private WorkMode(String codeValue) {\n" +
      "    code = codeValue;\n" +
      "  }\n" +
      "  public Integer rank() {\n" +
      "    switch on this {\n" +
      "      when ACTIVE {\n" +
      "        return 1;\n" +
      "      }\n" +
      "      when PAUSED {\n" +
      "        return 2;\n" +
      "      }\n" +
      "      when else {\n" +
      "        return 99;\n" +
      "      }\n" +
      "    }\n" +
      "  }\n" +
      "}\n";
    const doc = parseApex(source);
    const enumNode = doc.root.children.find((node) => node.kind === "enum_declaration" && node.name === "WorkMode");
    const constants = (enumNode?.children ?? []).filter((node) => node.kind === "statement_span" && node.statementKind === "enum-constant");
    const rankMethod = (enumNode?.children ?? []).find((node) => node.kind === "method_declaration" && node.name === "rank");
    const rankKinds = new Set((rankMethod?.children ?? []).map((node) => node.statementKind));

    expect(constants.map((node) => node.text)).toEqual(["ACTIVE('A'),", "PAUSED('P');"]);
    expect(rankKinds.has("switch-block")).toBe(true);
    expect(rankKinds.has("when-block")).toBe(true);
  });

  it("extracts getter/setter accessor blocks as method nodes and classifies nested accessor statements", () => {
    const source = readFileSync(propertyAccessorBoundaryFixturePath, "utf8");
    const doc = parseApex(source);
    const klass = doc.root.children.find((node) => node.kind === "class_declaration" && node.name === "PropertyAccessorBoundary");
    const accessors = (klass?.children ?? []).filter((node) => node.kind === "method_declaration" && (node.name === "get" || node.name === "set"));
    const getter = accessors.find((node) => node.name === "get");
    const setter = accessors.find((node) => node.name === "set");
    const getterKinds = new Set((getter?.children ?? []).map((node) => node.statementKind));
    const setterKinds = new Set((setter?.children ?? []).map((node) => node.statementKind));

    expect(accessors).toHaveLength(2);
    expect(getterKinds.has("if-block")).toBe(true);
    expect(getterKinds.has("return")).toBe(true);
    expect(setterKinds.has("if-block")).toBe(true);
  });

  it("extracts global accessor bodies and classifies query/control statements", () => {
    const source = readFileSync(propertyGlobalAccessorFixturePath, "utf8");
    const doc = parseApex(source);
    const klass = doc.root.children.find((node) => node.kind === "class_declaration" && node.name === "PropertyGlobalAccessor");
    const accessors = (klass?.children ?? []).filter((node) => node.kind === "method_declaration" && (node.name === "get" || node.name === "set"));
    const getter = accessors.find((node) => node.name === "get");
    const setter = accessors.find((node) => node.name === "set");
    const getterKinds = new Set((getter?.children ?? []).map((node) => node.statementKind));
    const setterKinds = new Set((setter?.children ?? []).map((node) => node.statementKind));

    expect(accessors).toHaveLength(2);
    expect(getterKinds.has("if-block")).toBe(true);
    expect(getterKinds.has("return")).toBe(true);
    expect(setterKinds.has("if-block")).toBe(true);
  });

  it("keeps declaration and control classification stable across format-reparse for comment-heavy stress fixture", async () => {
    const source = readFileSync(stressCommentDeclarationFixturePath, "utf8");
    const formatted = await prettier.format(source, { parser: "salesforce-apex", plugins: [plugin] });
    const originalDoc = parseApex(source);
    const formattedDoc = parseApex(formatted);

    const originalRootKinds = new Set(originalDoc.root.children.map((node) => node.kind));
    const formattedRootKinds = new Set(formattedDoc.root.children.map((node) => node.kind));
    const originalClass = originalDoc.root.children.find(
      (node) => node.kind === "class_declaration" && node.name === "DeclarationCommentDeclarationStress"
    );
    const formattedClass = formattedDoc.root.children.find(
      (node) => node.kind === "class_declaration" && node.name === "DeclarationCommentDeclarationStress"
    );
    const originalSummarize = originalClass?.children.find(
      (node) => node.kind === "method_declaration" && node.name === "summarize"
    );
    const formattedSummarize = formattedClass?.children.find(
      (node) => node.kind === "method_declaration" && node.name === "summarize"
    );
    const originalRun = originalClass?.children.find((node) => node.kind === "class_declaration" && node.name === "WorkerImpl");
    const formattedRun = formattedClass?.children.find((node) => node.kind === "class_declaration" && node.name === "WorkerImpl");
    const originalSummarizeKinds = new Set((originalSummarize?.children ?? []).map((node) => node.statementKind));
    const formattedSummarizeKinds = new Set((formattedSummarize?.children ?? []).map((node) => node.statementKind));
    const originalRunMethod = originalRun?.children.find((node) => node.kind === "method_declaration" && node.name === "run");
    const formattedRunMethod = formattedRun?.children.find((node) => node.kind === "method_declaration" && node.name === "run");
    const originalRunKinds = new Set((originalRunMethod?.children ?? []).map((node) => node.statementKind));
    const formattedRunKinds = new Set((formattedRunMethod?.children ?? []).map((node) => node.statementKind));

    expect(originalRootKinds).toEqual(formattedRootKinds);
    expect(originalRootKinds.has("class_declaration")).toBe(true);
    expect(originalClass).toBeDefined();
    expect(formattedClass).toBeDefined();
    expect(originalClass?.children.some((node) => node.kind === "interface_declaration")).toBe(true);
    expect(originalClass?.children.some((node) => node.kind === "enum_declaration")).toBe(true);
    expect(originalClass?.children.some((node) => node.kind === "class_declaration" && node.name === "WorkerImpl")).toBe(true);
    expect(originalSummarizeKinds).toEqual(formattedSummarizeKinds);
    expect(originalSummarizeKinds.has("declaration")).toBe(true);
    expect(originalSummarizeKinds.has("for-block")).toBe(true);
    expect(originalSummarizeKinds.has("if-block")).toBe(true);
    expect(originalSummarizeKinds.has("switch-block")).toBe(true);
    expect(originalSummarizeKinds.has("when-block")).toBe(true);
    expect(originalSummarizeKinds.has("try-block")).toBe(true);
    expect(originalSummarizeKinds.has("catch-block")).toBe(true);
    expect(originalSummarizeKinds.has("finally-block")).toBe(true);
    expect(originalRunKinds).toEqual(formattedRunKinds);
    expect(originalRunKinds.has("declaration")).toBe(true);
    expect(originalRunKinds.has("if-block")).toBe(true);
    expect(originalRunKinds.has("while-block")).toBe(true);
  });
});
