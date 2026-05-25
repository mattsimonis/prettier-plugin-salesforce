import type { ApexComment } from "./ast.js";

export function isPrettierIgnore(comment: ApexComment): boolean {
  return comment.text.includes("prettier-ignore");
}

export function isOwnLineComment(source: string, comment: ApexComment): boolean {
  const before = source.slice(0, comment.range.start.offset);
  const lineStart = before.lastIndexOf("\n") + 1;
  return source.slice(lineStart, comment.range.start.offset).trim() === "";
}
