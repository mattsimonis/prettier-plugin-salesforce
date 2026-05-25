import type { ApexDiagnostic, ApexDocument } from "./ast.js";
import { parseApex } from "./parser.js";

export type WorkerRequest = {
  id: string;
  mode: "class-or-trigger" | "anonymous";
  path: string;
  source: string;
};

export type WorkerResponse = {
  id: string;
  ok: boolean;
  document?: ApexDocument;
  diagnostics?: ApexDiagnostic[];
};

export async function parseWithFallbackWorker(request: WorkerRequest): Promise<WorkerResponse> {
  try {
    const document = parseApex(request.source, { anonymous: request.mode === "anonymous" });
    return {
      id: request.id,
      ok: true,
      document,
      diagnostics: document.diagnostics
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      id: request.id,
      ok: false,
      diagnostics: [
        {
          severity: "error",
          code: "APEX_FALLBACK_PARSE_ERROR",
          message
        }
      ]
    };
  }
}
