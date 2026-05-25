import { readFileSync } from "node:fs";
import prettier from "prettier";
import { describe, expect, test } from "vitest";
import plugin from "./index.js";
import { collectMetadataFixtureFilesSync } from "./metadata-fixture-files.js";
import {
  extractChildSequenceSignature,
  extractElementOrder,
  extractSiblingBlockSignature,
  extractStartTagAttributeSignature,
  extractStartTagAttributeValueSignature
} from "./xml/printer.js";

describe("metadata fixture structure contract", () => {
  test("metadata fixtures preserve structural signatures under formatting", async () => {
    const fixtureFiles = collectMetadataFixtureFilesSync();
    const failures: string[] = [];

    for (const file of fixtureFiles) {
      const relativePath = file.relativePath;
      const source = readFileSync(file.absolutePath, "utf8");

      try {
        const formatted = await prettier.format(source, { filepath: file.absolutePath, plugins: [plugin] });
        const secondPass = await prettier.format(formatted, { filepath: file.absolutePath, plugins: [plugin] });

        if (!formatted.endsWith("\n")) {
          failures.push(`${relativePath}\tmissing-trailing-newline`);
        }
        if (secondPass !== formatted) {
          failures.push(`${relativePath}\tnon-idempotent`);
        }
        if (JSON.stringify(extractElementOrder(source)) !== JSON.stringify(extractElementOrder(formatted))) {
          failures.push(`${relativePath}\telement-order-mismatch`);
        }
        if (
          JSON.stringify(extractSiblingBlockSignature(source)) !== JSON.stringify(extractSiblingBlockSignature(formatted))
        ) {
          failures.push(`${relativePath}\tsibling-block-signature-mismatch`);
        }
        if (
          JSON.stringify(extractChildSequenceSignature(source)) !== JSON.stringify(extractChildSequenceSignature(formatted))
        ) {
          failures.push(`${relativePath}\tchild-sequence-signature-mismatch`);
        }
        if (
          JSON.stringify(extractStartTagAttributeSignature(source)) !==
          JSON.stringify(extractStartTagAttributeSignature(formatted))
        ) {
          failures.push(`${relativePath}\tstart-tag-attribute-signature-mismatch`);
        }
        if (
          JSON.stringify(extractStartTagAttributeValueSignature(source)) !==
          JSON.stringify(extractStartTagAttributeValueSignature(formatted))
        ) {
          failures.push(`${relativePath}\tstart-tag-attribute-value-signature-mismatch`);
        }
      } catch (error) {
        failures.push(`${relativePath}\tformat-error\t${String(error).split("\n")[0]}`);
      }
    }

    expect(failures, `Metadata fixture structure contract failures:\n${failures.join("\n")}`).toEqual([]);
  });
});
