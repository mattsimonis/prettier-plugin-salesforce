export const PAYLOAD_TEXT_EXTENSIONS = [".email", ".resource", ".asset"] as const;
export const AGENTFORCE_AUTHORING_TEXT_EXTENSIONS = [".agent", ".agentscript", ".agentgraph"] as const;
export const GENERIC_TEXT_PAYLOAD_EXTENSIONS = [
  ".txt",
  ".cfg",
  ".sql",
  ".soql",
  ".csv",
  ".log",
  ".notes",
  ".dwl",
  ".schema",
  ".sh",
  ".bat",
  ".ini",
  ".properties",
  ".conf",
  ".env",
  ".toml",
  ".snap"
] as const;

export const STATICRESOURCE_PAYLOAD_TEXT_EXTENSIONS = [] as const;

export const KNOWN_TEXT_BASENAMES = [
  ".forceignore",
] as const;

export const PAYLOAD_TEXT_LANGUAGE_EXTENSIONS = [
  ...PAYLOAD_TEXT_EXTENSIONS,
  ".svg",
  ...AGENTFORCE_AUTHORING_TEXT_EXTENSIONS
] as const;

export const PAYLOAD_TEXT_LANGUAGE_FILENAMES = [...KNOWN_TEXT_BASENAMES] as readonly string[];
