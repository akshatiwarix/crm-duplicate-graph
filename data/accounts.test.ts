import { describe, expect, it } from "vitest";
import { getAccounts } from "./accounts";
import {
  ACCOUNT_TWINS_IDS,
  ACCOUNT_CHAIN_IDS,
  ACCOUNT_IMPOSTER_IDS,
  ACCOUNT_GHOST_IDS,
  TOTAL_ACCOUNTS,
} from "./generate";
import { scoreAccountPair } from "./pathology-formulas";
import { accountCorpusSchema, type Account } from "@/lib/domain/account";
import { DEFAULT_CORPUS_ID, DEFAULT_SIGNAL_WEIGHTS, DEFAULT_CONFIDENCE_TIERS } from "@/lib/domain/defaults";

const accounts = getAccounts(DEFAULT_CORPUS_ID);
const weights = DEFAULT_SIGNAL_WEIGHTS.account;
const tiers = DEFAULT_CONFIDENCE_TIERS.account;

function byId(id: string): Account {
  const found = accounts.find((a) => a.id === id);
  if (!found) throw new Error(`fixture not found: ${id}`);
  return found;
}

describe("committed account corpus", () => {
  it(`has ${TOTAL_ACCOUNTS} accounts and validates against the account schema`, () => {
    expect(accounts.length).toBe(TOTAL_ACCOUNTS);
    expect(() => accountCorpusSchema.parse(accounts)).not.toThrow();
  });

  it("has unique account ids", () => {
    expect(new Set(accounts.map((a) => a.id)).size).toBe(accounts.length);
  });
});

describe("THE TWINS", () => {
  it("scores at the top of the ranking — both tiers agree it's high", () => {
    const [idA, idB] = ACCOUNT_TWINS_IDS;
    const { score } = scoreAccountPair(byId(idA), byId(idB), weights);
    expect(score).toBeGreaterThanOrEqual(tiers.high);
  });
});

describe("THE CHAIN", () => {
  it("A-B and B-C each clear the possible floor, but A-C shares nothing", () => {
    const [idA, idB, idC] = ACCOUNT_CHAIN_IDS;
    const a = byId(idA);
    const b = byId(idB);
    const c = byId(idC);

    expect(scoreAccountPair(a, b, weights).score).toBeGreaterThanOrEqual(tiers.possible);
    expect(scoreAccountPair(b, c, weights).score).toBeGreaterThanOrEqual(tiers.possible);
    expect(scoreAccountPair(a, c, weights).score).toBeLessThan(tiers.possible);
  });
});

describe("THE IMPOSTER", () => {
  it("has a deceptively similar name but disagrees on every corroborating signal, refused below possible", () => {
    const [idA, idB] = ACCOUNT_IMPOSTER_IDS;
    const a = byId(idA);
    const b = byId(idB);
    const { score, nameSim, domainEq, phoneEq } = scoreAccountPair(a, b, weights);

    // Deceptive but not deceptive enough to clear the independent-signal floor.
    expect(nameSim).toBeGreaterThan(0.5);
    expect(nameSim).toBeLessThan(weights.nameFloor);
    expect(domainEq).toBe(false);
    expect(phoneEq).toBe(false);
    expect(score).toBeLessThan(tiers.possible);
  });
});

describe("THE GHOST", () => {
  it("lands right at the possible boundary on a name signal alone", () => {
    const [idA, idB] = ACCOUNT_GHOST_IDS;
    const { score } = scoreAccountPair(byId(idA), byId(idB), weights);

    expect(score).toBeGreaterThanOrEqual(tiers.possible);
    expect(score).toBeLessThan(tiers.possible + 15);
  });
});
