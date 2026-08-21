import { describe, expect, it } from "vitest";
import { buildContactEdge, buildAccountEdge } from "./scoring";
import { DEFAULT_SIGNAL_WEIGHTS, DEFAULT_CONFIDENCE_TIERS } from "@/lib/domain/defaults";
import type { Contact } from "@/lib/domain/contact";
import type { Account } from "@/lib/domain/account";

const cw = DEFAULT_SIGNAL_WEIGHTS.contact;
const ct = DEFAULT_CONFIDENCE_TIERS.contact;
const aw = DEFAULT_SIGNAL_WEIGHTS.account;
const at = DEFAULT_CONFIDENCE_TIERS.account;

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

describe("buildContactEdge", () => {
  it("scores phoneExact alone as `possible` (hand-computed: 30)", () => {
    const a = contact({ id: "a", firstName: "Alpha", lastName: "One", email: "a@x.com", company: "Wholly Unrelated Corp" });
    const b = contact({ id: "b", firstName: "Zeta", lastName: "Nine", email: "b@y.com", phone: "(212) 555-0100", company: "Completely Different Inc" });
    const edge = buildContactEdge(a, b, cw, ct);
    expect(edge?.score).toBe(30);
    expect(edge?.tier).toBe("possible");
    expect(edge?.signals).toEqual([{ signal: "phoneExact", points: 30, detail: expect.any(String) }]);
  });

  it("sums emailExact + the joint name/company pairScore (hand-computed: 50 + 30 = 80)", () => {
    const a = contact({ id: "a", email: "same@example.com", firstName: "Priya", lastName: "Nakamura", company: "Fernbridge Robotics" });
    const b = contact({ id: "b", email: "Same@Example.com", phone: "(999) 555-9999", firstName: "Priya", lastName: "Nakamura", company: "Fernbridge Robotics" });
    // identical normalized name and company -> nameSim = companySim = 1
    // pairScore = round(15*1 + 15*1) = 30
    const edge = buildContactEdge(a, b, cw, ct);
    expect(edge?.score).toBe(80);
    expect(edge?.tier).toBe("high");
  });

  it("returns null when no signal clears the possible floor", () => {
    const a = contact({ id: "a", email: "a@x.com", phone: "(212) 555-0100", firstName: "Alpha", lastName: "One", company: "Foo Bar" });
    const b = contact({ id: "b", email: "b@y.com", phone: "(646) 555-0200", firstName: "Zeta", lastName: "Nine", company: "Wholly Unrelated Corp" });
    expect(buildContactEdge(a, b, cw, ct)).toBeNull();
  });
});

describe("buildAccountEdge", () => {
  it("sums domainExact + the independent nameFuzzy signal (hand-computed: 60 + 25 = 85)", () => {
    const a = account({ id: "a", domain: "foobar.com", name: "Foo Bar" });
    const b = account({ id: "b", domain: "FooBar.com", name: "Foo Bar", phone: "(646) 555-0200", address: "9 Oak Ave, Nowhere, CA 90000" });
    // identical normalized name -> nameSim = 1 -> nameScore = round(25*1) = 25
    const edge = buildAccountEdge(a, b, aw, at);
    expect(edge?.score).toBe(85);
    expect(edge?.tier).toBe("high");
  });

  it("scores an identical address alone as `possible` (hand-computed: round(20*1) = 20)", () => {
    const a = account({ id: "a", domain: "foobar.com", name: "Foo Bar", address: "1 Main St, Springfield, IL 60007" });
    const b = account({ id: "b", domain: "other.com", name: "Wholly Unrelated Co", phone: "(646) 555-0200", address: "1 Main St, Springfield, IL 60007" });
    const edge = buildAccountEdge(a, b, aw, at);
    expect(edge?.score).toBe(20);
    expect(edge?.tier).toBe("possible");
  });

  it("returns null when no signal clears the possible floor", () => {
    const a = account({ id: "a" });
    const b = account({ id: "b", domain: "other.com", name: "Wholly Unrelated Co", phone: "(646) 555-0200", address: "9 Oak Ave, Nowhere, CA 90000" });
    expect(buildAccountEdge(a, b, aw, at)).toBeNull();
  });
});
