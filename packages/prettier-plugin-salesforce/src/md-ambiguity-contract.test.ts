import { describe, expect, test } from "vitest";
import prettier from "prettier";
import plugin from "./index.js";

describe(".md ambiguity contract", () => {
  test("customMetadata/*.md inferred output matches explicit metadata parser output", async () => {
    const filepath = "/tmp/force-app/main/default/customMetadata/Foo.Bar.md";
    const source = "<CustomMetadata><label>Foo</label><protected>false</protected></CustomMetadata>";

    const inferred = await prettier.format(source, { filepath, plugins: [plugin] });
    const explicitMetadata = await prettier.format(source, {
      filepath,
      plugins: [plugin],
      parser: "salesforce-metadata-xml"
    });

    expect(inferred).toBe(explicitMetadata);
  });

  test("exports/*.md custom metadata records inferred output matches explicit metadata parser output", async () => {
    const filepath = "/tmp/exports/Foo.Bar.md";
    const source = "<CustomMetadata><label>Foo</label><protected>false</protected></CustomMetadata>";

    const inferred = await prettier.format(source, { filepath, plugins: [plugin] });
    const explicitMetadata = await prettier.format(source, {
      filepath,
      plugins: [plugin],
      parser: "salesforce-metadata-xml"
    });

    expect(inferred).toBe(explicitMetadata);
  });

  test("relative exports/*.md custom metadata records inferred output matches explicit metadata parser output", async () => {
    const filepath = "exports/Foo.Bar.md";
    const source = "<CustomMetadata><label>Foo</label><protected>false</protected></CustomMetadata>";

    const inferred = await prettier.format(source, { filepath, plugins: [plugin] });
    const explicitMetadata = await prettier.format(source, {
      filepath,
      plugins: [plugin],
      parser: "salesforce-metadata-xml"
    });

    expect(inferred).toBe(explicitMetadata);
  });

  test("generic markdown inferred output matches explicit markdown parser output", async () => {
    const filepath = "/tmp/README.md";
    const source = ["# Title", "", "- one", "- two", ""].join("\n");

    const inferred = await prettier.format(source, { filepath, plugins: [plugin] });
    const explicitMarkdown = await prettier.format(source, {
      filepath,
      plugins: [plugin],
      parser: "markdown"
    });

    expect(inferred).toBe(explicitMarkdown);
  });

  test("exports markdown with dotted version name stays markdown", async () => {
    const filepath = "/tmp/exports/Release.v1.md";
    const source = ["# Release v1", "", "- Added support", ""].join("\n");

    const inferred = await prettier.format(source, { filepath, plugins: [plugin] });
    const explicitMarkdown = await prettier.format(source, {
      filepath,
      plugins: [plugin],
      parser: "markdown"
    });

    expect(inferred).toBe(explicitMarkdown);
  });

  test("exports markdown with common docs basenames stays markdown", async () => {
    const filepath = "/tmp/exports/Readme.Setup.md";
    const source = ["# Setup", "", "1. Install", "2. Run", ""].join("\n");

    const inferred = await prettier.format(source, { filepath, plugins: [plugin] });
    const explicitMarkdown = await prettier.format(source, {
      filepath,
      plugins: [plugin],
      parser: "markdown"
    });

    expect(inferred).toBe(explicitMarkdown);
  });

  test("exports markdown with dotted year name stays markdown", async () => {
    const filepath = "/tmp/exports/Changelog.2026.md";
    const source = ["# 2026", "", "- Added support", ""].join("\n");

    const inferred = await prettier.format(source, { filepath, plugins: [plugin] });
    const explicitMarkdown = await prettier.format(source, {
      filepath,
      plugins: [plugin],
      parser: "markdown"
    });

    expect(inferred).toBe(explicitMarkdown);
  });

  test("customMetadata README.md stays markdown", async () => {
    const filepath = "/tmp/force-app/main/default/customMetadata/README.md";
    const source = ["# Custom Metadata Notes", "", "- do not format as metadata", ""].join("\n");

    const inferred = await prettier.format(source, { filepath, plugins: [plugin] });
    const explicitMarkdown = await prettier.format(source, {
      filepath,
      plugins: [plugin],
      parser: "markdown"
    });

    expect(inferred).toBe(explicitMarkdown);
  });

});
