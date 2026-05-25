import type { Parser } from "prettier";
import { routeFile, type SalesforceRoute } from "../routing.js";
import { detectSalesforceMarkupDialect } from "../markup/parser.js";
import { metadataCanonicalFamilyFromMetadataSource } from "../metadata-family-routing.js";

export type SalesforceAst = {
  kind: "salesforce-router";
  route: SalesforceRoute;
  text: string;
  filepath: string | null;
};

export function createParser(route: SalesforceRoute): Parser<SalesforceAst> {
  return {
    astFormat: "salesforce-router",
    parse: (text, options) => ({ kind: "salesforce-router", route, text, filepath: getFilepathFromOptions(options) }),
    locStart: () => 0,
    locEnd: (node) => node.text.length
  };
}

export function createPathAwareParser(fallbackRoute: SalesforceRoute): Parser<SalesforceAst> {
  return {
    astFormat: "salesforce-router",
    parse: (text, options) => {
      const filepath = getFilepathFromOptions(options);
      return {
        kind: "salesforce-router",
        route: resolveRouteFromOptions(options, fallbackRoute, text),
        text,
        filepath
      };
    },
    locStart: () => 0,
    locEnd: (node) => node.text.length
  };
}

function getFilepathFromOptions(options: unknown): string | null {
  if (!options || typeof options !== "object") {
    return null;
  }
  const filepath = (options as { filepath?: unknown }).filepath;
  return typeof filepath === "string" ? filepath : null;
}

function resolveRouteFromOptions(options: unknown, fallbackRoute: SalesforceRoute, source: string): SalesforceRoute {
  if (!options || typeof options !== "object") {
    return resolveRouteFromSourceFallback(fallbackRoute, source);
  }

  const filepath = (options as { filepath?: unknown }).filepath;
  if (typeof filepath !== "string") {
    return resolveRouteFromSourceFallback(fallbackRoute, source);
  }

  const route = routeFile(filepath);
  const normalized = filepath.toLowerCase();
  if (route === "unknown") {
    return resolveRouteFromSourceFallback(fallbackRoute, source);
  }
  if (route !== "payload-text") {
    return route;
  }
  if (normalized.endsWith(".email")) {
    return shouldTreatEmailAsStructuredXml(source) ? "metadata-xml" : route;
  }
  if (normalized.endsWith(".resource") || normalized.endsWith(".asset")) {
    return shouldTreatPayloadAsStructuredXml(source) ? "metadata-xml" : route;
  }
  if (normalized.endsWith(".svg")) {
    return shouldTreatPayloadAsStructuredXml(source) ? "metadata-xml" : route;
  }
  return route;
}

function resolveRouteFromSourceFallback(fallbackRoute: SalesforceRoute, source: string): SalesforceRoute {
  const dialect = detectSalesforceMarkupDialect(source);
  if (dialect !== "unknown") {
    return "markup";
  }
  if (shouldTreatPayloadAsStructuredXml(source)) {
    return metadataCanonicalFamilyFromMetadataSource(source) === null ? fallbackRoute : "metadata-xml";
  }
  return fallbackRoute;
}

function shouldTreatEmailAsStructuredXml(source: string): boolean {
  const trimmed = normalizeLeadingStructuredMarkup(source);
  if (trimmed.length === 0 || !trimmed.startsWith("<")) {
    return false;
  }

  if (/^<\?xml\b/i.test(trimmed)) {
    return true;
  }
  if (/^<!doctype\s+html\b/i.test(trimmed)) {
    return true;
  }
  return /^<(?:messaging:)?emailtemplate\b|^<(?:html|table|body|head|style|div|span|p|tr|td)\b/i.test(trimmed);
}

function shouldTreatPayloadAsStructuredXml(source: string): boolean {
  const trimmed = normalizeLeadingStructuredMarkup(source);
  if (trimmed.length === 0 || !trimmed.startsWith("<")) {
    return false;
  }
  if (/^<\?xml\b/i.test(trimmed)) {
    return true;
  }
  if (/^<!doctype\s+html\b/i.test(trimmed)) {
    return true;
  }
  return /^<(?:html|svg|table|body|head|style|div|span|p|tr|td|xml)\b/i.test(trimmed);
}

function normalizeLeadingStructuredMarkup(source: string): string {
  let remaining = source.trimStart();
  if (remaining.startsWith("\uFEFF")) {
    remaining = remaining.slice(1).trimStart();
  }
  while (remaining.startsWith("<!--")) {
    const endIndex = remaining.indexOf("-->");
    if (endIndex < 0) {
      break;
    }
    remaining = remaining.slice(endIndex + 3).trimStart();
  }
  return remaining;
}
