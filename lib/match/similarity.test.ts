import { describe, expect, it } from "vitest";
import { similarity } from "./similarity";

describe("similarity", () => {
  it("is 1 for identical strings", () => {
    expect(similarity("acme", "acme")).toBe(1);
  });

  it("is 0 for completely different strings of the same length", () => {
    expect(similarity("abc", "xyz")).toBe(0);
  });

  it("matches the formula for a hand-computed case", () => {
    // levenshtein("kitten", "sitting") = 3, max(len) = 7 -> 1 - 3/7
    expect(similarity("kitten", "sitting")).toBeCloseTo(1 - 3 / 7, 10);
  });

  it("guards the empty/empty case against division by zero", () => {
    expect(similarity("", "")).toBe(1);
  });
});
