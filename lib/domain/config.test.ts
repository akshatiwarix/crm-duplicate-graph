import { describe, expect, it } from "vitest";
import { configSchema } from "./config";
import { DEFAULT_CONFIG } from "./defaults";

describe("configSchema", () => {
  it("accepts the default config", () => {
    expect(configSchema.safeParse(DEFAULT_CONFIG).success).toBe(true);
  });

  it("rejects an inverted contact tier (possible > high)", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.tiers.contact = { high: 25, possible: 50 };
    expect(configSchema.safeParse(config).success).toBe(false);
  });

  it("rejects an inverted account tier (possible > high)", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.tiers.account = { high: 20, possible: 55 };
    expect(configSchema.safeParse(config).success).toBe(false);
  });

  it("rejects a negative weight", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.weights.contact.emailExact = -1;
    expect(configSchema.safeParse(config).success).toBe(false);
  });

  it("rejects a floor above 1", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.weights.contact.nameFloor = 1.1;
    expect(configSchema.safeParse(config).success).toBe(false);
  });

  it("rejects a negative floor", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.weights.account.addressFloor = -0.1;
    expect(configSchema.safeParse(config).success).toBe(false);
  });

  it("rejects an empty corpusId", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.corpusId = "";
    expect(configSchema.safeParse(config).success).toBe(false);
  });
});
