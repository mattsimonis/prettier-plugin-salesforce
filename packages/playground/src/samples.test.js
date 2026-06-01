import { describe, expect, it } from "vitest";
import { extraSamples } from "./samples.js";

describe("playground sample library", () => {
  it("adds expanded Apex and larger metadata examples without calling them complex", () => {
    expect(extraSamples.some((sample) => sample.complexity === "complex")).toBe(false);
    expect(extraSamples.some((sample) => sample.label.toLowerCase().includes("complex"))).toBe(false);
    expect(extraSamples.filter((sample) => sample.group === "Apex" && sample.complexity === "expanded")).toHaveLength(2);
    expect(extraSamples.filter((sample) => sample.group === "Metadata" && sample.complexity === "large")).toHaveLength(3);
  });

  it("includes a large Custom Labels metadata file", () => {
    const sample = extraSamples.find((entry) => entry.label === "Large Custom Labels");
    expect(sample).toMatchObject({
      group: "Metadata",
      complexity: "large",
      filepath: "force-app/main/default/labels/CustomLabels.labels-meta.xml"
    });

    const labelNames = Array.from(sample.text.matchAll(/<fullName>([^<]+)<\/fullName>/g), (match) => match[1]);
    expect(labelNames).toHaveLength(30);
    expect(new Set(labelNames).size).toBe(30);
    expect(labelNames[0]).toBe("Z_Commerce_Cart_Recovery");
    expect(labelNames.at(-1)).toBe("B_Invoice_Writeoff_Reason");
  });
});
