export type ApexPosition = {
  line: number;
  column: number;
  offset: number;
};

export type ApexRange = {
  start: ApexPosition;
  end: ApexPosition;
};

export type ApexComment = {
  kind: "line" | "block";
  text: string;
  value: string;
  printed: boolean;
  range: ApexRange;
};

export type ApexNode = {
  kind: string;
  name?: string;
  statementKind?: ApexStatementKind;
  text?: string;
  range: ApexRange;
  children: ApexNode[];
};

export type ApexStatementKind =
  | "enum-constant"
  | "if-block"
  | "for-block"
  | "while-block"
  | "do-block"
  | "switch-block"
  | "when-block"
  | "try-block"
  | "catch-block"
  | "finally-block"
  | "return"
  | "dml"
  | "soql"
  | "sosl"
  | "throw"
  | "break"
  | "continue"
  | "assignment"
  | "assignment-update"
  | "plain-call"
  | "chained-call"
  | "query-call"
  | "dml-call"
  | "declaration"
  | "unknown";

export type ApexToken =
  | { kind: "line-comment" | "block-comment"; text: string; range: ApexRange }
  | { kind: "open-brace" | "close-brace" | "open-paren" | "close-paren" | "open-bracket" | "close-bracket"; text: string; range: ApexRange };

export type ApexDocument = {
  kind: "apex-document";
  mode: "class-or-trigger" | "anonymous";
  source: string;
  root: ApexNode;
  tokens: ApexToken[];
  comments: ApexComment[];
  diagnostics: ApexDiagnostic[];
};

export type ApexDiagnostic = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  range?: ApexRange;
};
