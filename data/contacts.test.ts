import { describe, expect, it } from "vitest";
import { getContacts } from "./contacts";
import {
  CONTACT_TWINS_IDS,
  CONTACT_CHAIN_IDS,
  CONTACT_IMPOSTER_IDS,
  CONTACT_GHOST_IDS,
  TOTAL_CONTACTS,
} from "./generate";
import { scoreContactPair } from "./pathology-formulas";
import { contactCorpusSchema, type Contact } from "@/lib/domain/contact";
import { DEFAULT_CORPUS_ID, DEFAULT_SIGNAL_WEIGHTS, DEFAULT_CONFIDENCE_TIERS } from "@/lib/domain/defaults";

const contacts = getContacts(DEFAULT_CORPUS_ID);
const weights = DEFAULT_SIGNAL_WEIGHTS.contact;
const tiers = DEFAULT_CONFIDENCE_TIERS.contact;

function byId(id: string): Contact {
  const found = contacts.find((c) => c.id === id);
  if (!found) throw new Error(`fixture not found: ${id}`);
  return found;
}

describe("committed contact corpus", () => {
  it(`has ${TOTAL_CONTACTS} contacts and validates against the contact schema`, () => {
    expect(contacts.length).toBe(TOTAL_CONTACTS);
    expect(() => contactCorpusSchema.parse(contacts)).not.toThrow();
  });

  it("has unique contact ids", () => {
    expect(new Set(contacts.map((c) => c.id)).size).toBe(contacts.length);
  });
});

describe("THE TWINS", () => {
  it("scores at the top of the ranking — both tiers agree it's high", () => {
    const [idA, idB] = CONTACT_TWINS_IDS;
    const { score } = scoreContactPair(byId(idA), byId(idB), weights);
    expect(score).toBeGreaterThanOrEqual(tiers.high);
  });
});

describe("THE CHAIN", () => {
  it("A-B and B-C each clear the possible floor, but A-C shares nothing", () => {
    const [idA, idB, idC] = CONTACT_CHAIN_IDS;
    const a = byId(idA);
    const b = byId(idB);
    const c = byId(idC);

    expect(scoreContactPair(a, b, weights).score).toBeGreaterThanOrEqual(tiers.possible);
    expect(scoreContactPair(b, c, weights).score).toBeGreaterThanOrEqual(tiers.possible);
    expect(scoreContactPair(a, c, weights).score).toBeLessThan(tiers.possible);
  });
});

describe("THE IMPOSTER", () => {
  it("has a deceptively similar name but disagrees on every corroborating signal, refused below possible", () => {
    const [idA, idB] = CONTACT_IMPOSTER_IDS;
    const a = byId(idA);
    const b = byId(idB);
    const { score, nameSim, companySim, emailEq, phoneEq, linkedinEq } = scoreContactPair(a, b, weights);

    expect(nameSim).toBeGreaterThanOrEqual(weights.nameFloor);
    expect(companySim).toBeLessThan(weights.companyFloor);
    expect(emailEq).toBe(false);
    expect(phoneEq).toBe(false);
    expect(linkedinEq).toBe(false);
    expect(score).toBeLessThan(tiers.possible);
  });
});

describe("THE GHOST", () => {
  it("lands right at the possible boundary on a name/company pair alone", () => {
    const [idA, idB] = CONTACT_GHOST_IDS;
    const { score } = scoreContactPair(byId(idA), byId(idB), weights);

    expect(score).toBeGreaterThanOrEqual(tiers.possible);
    expect(score).toBeLessThan(tiers.possible + 15);
  });
});
