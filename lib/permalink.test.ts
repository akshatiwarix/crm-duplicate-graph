import { describe, expect, it } from "vitest";
import { decodePermalink, encodePermalink } from "./permalink";
import { DEFAULT_CONFIG } from "@/lib/domain/defaults";

describe("permalink codec", () => {
  it("round-trips a Config exactly", () => {
    const encoded = encodePermalink(DEFAULT_CONFIG);
    const decoded = decodePermalink(encoded);
    expect(decoded).toEqual(DEFAULT_CONFIG);
  });

  it("produces a URL-safe string with no padding", () => {
    const encoded = encodePermalink(DEFAULT_CONFIG);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("round-trips a config with adjusted weights and tiers", () => {
    const config = {
      ...DEFAULT_CONFIG,
      weights: {
        ...DEFAULT_CONFIG.weights,
        contact: { ...DEFAULT_CONFIG.weights.contact, emailExact: 75, nameFloor: 0.9 },
      },
      tiers: {
        ...DEFAULT_CONFIG.tiers,
        account: { high: 80, possible: 40 },
      },
    };
    const decoded = decodePermalink(encodePermalink(config));
    expect(decoded).toEqual(config);
  });

  it("rejects a garbage payload", () => {
    expect(() => decodePermalink("not-a-valid-permalink")).toThrow();
  });
});
