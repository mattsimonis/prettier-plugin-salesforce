export type WasmApexNode = {
  kind: string;
  text?: string;
  startOffset: number;
  endOffset: number;
  children: WasmApexNode[];
};

export type WasmApexParseResult = {
  root: WasmApexNode;
  errors: WasmApexNode[];
};

export async function parseApexWithWasm(source: string): Promise<WasmApexParseResult> {
  const root: WasmApexNode = {
    kind: "CompilationUnit",
    text: source,
    startOffset: 0,
    endOffset: source.length,
    children: [],
  };

  return {
    root,
    errors: [],
  };
}
