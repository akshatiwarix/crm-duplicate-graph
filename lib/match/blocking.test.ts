import { describe, expect, it } from "vitest";
import { contactBlockKeys, accountBlockKeys, candidatePairs, bruteForcePairs } from "./blocking";
import type { Contact } from "@/lib/domain/contact";
import type { Account } from "@/lib/domain/account";

function contact(overrides: Partial<Contact>): Contact {
  return {
    id: "c1",
    firstName: "Alpha",
    lastName: "One",
    email: "alpha.one@example.com",
    phone: "(212) 555-0100",
    company: "Foo Bar",
    ...overrides,
  };
}

function account(overrides: Partial<Account>): Account {
  return {
    id: "a1",
    name: "Foo Bar",
    domain: "foobar.com",
    phone: "(212) 555-0100",
    address: "1 Main St, Springfield, IL 60007",
    ...overrides,
  };
}

describe("candidatePairs (contacts)", () => {
  it("pairs two contacts sharing only an email bucket", () => {
    const a = contact({ id: "a", email: "same@x.com", phone: "(212) 555-0100", firstName: "Alpha", lastName: "One" });
    const b = contact({ id: "b", email: "Same@X.com", phone: "(646) 555-0200", firstName: "Zeta", lastName: "Nine" });
    expect(candidatePairs([a, b], contactBlockKeys)).toEqual([["a", "b"]]);
  });

  it("pairs two contacts sharing only a phone6 bucket", () => {
    const a = contact({ id: "a", email: "a@x.com", phone: "(212) 555-0100", firstName: "Alpha", lastName: "One" });
    const b = contact({ id: "b", email: "b@y.com", phone: "212.555.0100", firstName: "Zeta", lastName: "Nine" });
    expect(candidatePairs([a, b], contactBlockKeys)).toEqual([["a", "b"]]);
  });

  it("pairs two contacts sharing only a linkedin bucket", () => {
    const a = contact({ id: "a", email: "a@x.com", phone: "(212) 555-0100", firstName: "Alpha", lastName: "One", linkedinUrl: "linkedin.com/in/same" });
    const b = contact({ id: "b", email: "b@y.com", phone: "(646) 555-0200", firstName: "Zeta", lastName: "Nine", linkedinUrl: "https://www.linkedin.com/in/same/" });
    expect(candidatePairs([a, b], contactBlockKeys)).toEqual([["a", "b"]]);
  });

  it("does not pair contacts sharing no blocking key", () => {
    const a = contact({ id: "a", email: "a@x.com", phone: "(212) 555-0100", firstName: "Alpha", lastName: "One" });
    const b = contact({ id: "b", email: "b@y.com", phone: "(646) 555-0200", firstName: "Zeta", lastName: "Nine" });
    expect(candidatePairs([a, b], contactBlockKeys)).toEqual([]);
  });

  it("deduplicates a pair that shares more than one bucket", () => {
    const a = contact({ id: "a", email: "same@x.com", phone: "(212) 555-0100", firstName: "Alpha", lastName: "One" });
    const b = contact({ id: "b", email: "Same@X.com", phone: "212.555.0100", firstName: "Zeta", lastName: "Nine" });
    expect(candidatePairs([a, b], contactBlockKeys)).toEqual([["a", "b"]]);
  });
});

describe("candidatePairs (accounts)", () => {
  it("pairs two accounts sharing only a domain bucket", () => {
    const a = account({ id: "a", domain: "same.com", phone: "(212) 555-0100", name: "Foo" });
    const b = account({ id: "b", domain: "Same.com", phone: "(646) 555-0200", name: "Bar" });
    expect(candidatePairs([a, b], accountBlockKeys)).toEqual([["a", "b"]]);
  });

  it("pairs two accounts sharing only a name4 bucket", () => {
    const a = account({ id: "a", domain: "one.com", phone: "(212) 555-0100", name: "Vertex Systems" });
    const b = account({ id: "b", domain: "two.com", phone: "(646) 555-0200", name: "Vertex Analytics" });
    expect(candidatePairs([a, b], accountBlockKeys)).toEqual([["a", "b"]]);
  });

  it("does not pair accounts sharing no blocking key", () => {
    const a = account({ id: "a", domain: "one.com", phone: "(212) 555-0100", name: "Foo" });
    const b = account({ id: "b", domain: "two.com", phone: "(646) 555-0200", name: "Bar" });
    expect(candidatePairs([a, b], accountBlockKeys)).toEqual([]);
  });
});

describe("bruteForcePairs", () => {
  it("returns every unordered pair, n*(n-1)/2 total", () => {
    const records = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const pairs = bruteForcePairs(records);
    expect(pairs).toHaveLength(6);
    expect(new Set(pairs.map((p) => p.join("|"))).size).toBe(6);
  });
});
