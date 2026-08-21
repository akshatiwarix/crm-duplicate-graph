import { describe, expect, it } from "vitest";
import {
  normalizeEmail,
  normalizePhone,
  normalizeContactName,
  normalizeCompanyName,
  normalizeLinkedin,
  normalizeDomain,
  normalizeAddress,
} from "./normalize";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Jane.Smith@Company.com  ")).toBe("janesmith@company.com");
  });

  it("strips a +tag from the local part", () => {
    expect(normalizeEmail("john.doe+work@gmail.com")).toBe("johndoe@gmail.com");
  });

  it("removes dots from the local part uniformly, not just for gmail", () => {
    expect(normalizeEmail("j.a.n.e@outlook.com")).toBe("jane@outlook.com");
  });
});

describe("normalizePhone", () => {
  it("strips formatting and keeps the last 10 digits", () => {
    expect(normalizePhone("+1 (415) 555-0142")).toBe("4155550142");
    expect(normalizePhone("415.555.0142")).toBe("4155550142");
  });

  it("returns whatever digits exist when there are fewer than 10", () => {
    expect(normalizePhone("555-0142")).toBe("5550142");
  });
});

describe("normalizeContactName", () => {
  it("lowercases, trims, and collapses whitespace", () => {
    expect(normalizeContactName("  Jonathan   Reyes ")).toBe("jonathan reyes");
  });
});

describe("normalizeCompanyName", () => {
  it("strips a trailing legal suffix with or without a period", () => {
    expect(normalizeCompanyName("Acme Corp")).toBe("acme");
    expect(normalizeCompanyName("Acme Corp.")).toBe("acme");
    expect(normalizeCompanyName("Vertex Systems LLC")).toBe("vertex systems");
    expect(normalizeCompanyName("Kestrel Ironworks Inc.")).toBe("kestrel ironworks");
  });
});

describe("normalizeLinkedin", () => {
  it("strips protocol, www, and a trailing slash", () => {
    expect(normalizeLinkedin("https://www.linkedin.com/in/marisolferreira77/")).toBe(
      "linkedin.com/in/marisolferreira77",
    );
    expect(normalizeLinkedin("linkedin.com/in/marisolferreira77")).toBe(
      "linkedin.com/in/marisolferreira77",
    );
  });
});

describe("normalizeDomain", () => {
  it("strips protocol, www, and any path", () => {
    expect(normalizeDomain("https://www.example.com/pricing")).toBe("example.com");
    expect(normalizeDomain("WWW.Example.COM")).toBe("example.com");
    expect(normalizeDomain("example.com")).toBe("example.com");
  });
});

describe("normalizeAddress", () => {
  it("canonicalizes street suffixes even when comma-adjacent", () => {
    expect(normalizeAddress("480 Harbor Blvd, Ivywood, NY 10452")).toBe(
      normalizeAddress("480 Harbor Boulevard, Ivywood, NY 10452"),
    );
  });

  it("canonicalizes every mapped suffix pair", () => {
    expect(normalizeAddress("1 Main Street")).toBe(normalizeAddress("1 Main St"));
    expect(normalizeAddress("2 Oak Avenue")).toBe(normalizeAddress("2 Oak Ave"));
    expect(normalizeAddress("3 Elm Road")).toBe(normalizeAddress("3 Elm Rd"));
  });
});
