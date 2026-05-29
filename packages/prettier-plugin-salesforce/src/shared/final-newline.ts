export type FinalNewlineOptions = {
  salesforceFinalNewline?: unknown;
};

export function applyFinalNewlinePreference(source: string, options: unknown = {}): string {
  const withoutTrailingNewlines = source.replace(/\n+$/, "");
  if (isFinalNewlineDisabled(options)) {
    return withoutTrailingNewlines;
  }
  return `${withoutTrailingNewlines}\n`;
}

function isFinalNewlineDisabled(options: unknown): boolean {
  return typeof options === "object" && options !== null && (options as FinalNewlineOptions).salesforceFinalNewline === false;
}
