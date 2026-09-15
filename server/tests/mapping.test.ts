import { describe, expect, it } from "vitest";
import { linkIds, readAttachments, writeAttachments } from "../src/airtable/mapping.js";

describe("mapping Airtable", () => {
  it("linkIds ne garde que les chaînes d'un tableau", () => {
    expect(linkIds(["recA", "recB"])).toEqual(["recA", "recB"]);
    expect(linkIds(undefined)).toEqual([]);
    expect(linkIds("recA")).toEqual([]);
  });

  it("readAttachments normalise les pièces jointes Airtable", () => {
    const result = readAttachments([
      { id: "att1", url: "https://example.com/a.png", filename: "a.png", size: 123, type: "image/png" },
    ]);
    expect(result).toEqual([
      { id: "att1", url: "https://example.com/a.png", filename: "a.png", size: 123, type: "image/png" },
    ]);
    expect(readAttachments(undefined)).toEqual([]);
  });

  it("writeAttachments filtre les entrées sans URL et ignore undefined", () => {
    expect(writeAttachments(undefined)).toBeUndefined();
    expect(writeAttachments([{ url: "  " }, { url: "https://example.com/b.png", filename: "b.png" }])).toEqual([
      { url: "https://example.com/b.png", filename: "b.png" },
    ]);
  });
});
