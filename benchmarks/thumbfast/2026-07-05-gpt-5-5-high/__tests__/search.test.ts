import { describe, expect, it } from "vitest";
import {
  includesSearch,
  matchesAnySearch,
  normalizeSearchTerm,
} from "../convex/utils/search";

describe("normalizeSearchTerm", () => {
  it("trims and drops empty values", () => {
    expect(normalizeSearchTerm("  codelyn  ")).toBe("codelyn");
    expect(normalizeSearchTerm("   ")).toBeUndefined();
    expect(normalizeSearchTerm(undefined)).toBeUndefined();
  });
});

describe("includesSearch", () => {
  it("matches case-insensitively", () => {
    expect(includesSearch("Codeline Studio", "code")).toBe(true);
    expect(includesSearch("codelyn", "CODE")).toBe(true);
    expect(includesSearch("thumbfa.st", "ST")).toBe(true);
  });

  it("returns false when there is no match", () => {
    expect(includesSearch("Acme", "codelyn")).toBe(false);
  });
});

describe("matchesAnySearch", () => {
  it("matches when any field matches", () => {
    expect(
      matchesAnySearch("CODE", null, "user@codelyn.dev", "Other Name"),
    ).toBe(true);
  });
});
