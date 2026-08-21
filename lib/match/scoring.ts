import type { Contact } from "@/lib/domain/contact";
import type { Account } from "@/lib/domain/account";
import type { ContactSignalWeights, AccountSignalWeights } from "@/lib/domain/weights";
import type { MatchEdge, MatchSignal } from "@/lib/domain/result";
import {
  normalizeEmail,
  normalizePhone,
  normalizeContactName,
  normalizeCompanyName,
  normalizeLinkedin,
  normalizeDomain,
  normalizeAddress,
} from "./normalize";
import { similarity } from "./similarity";

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export type PairScore = { score: number; signals: MatchSignal[] };

/**
 * `score = emailExact + phoneExact + linkedinExact + pairScore` (PLAN.md §
 * Method). `pairScore` is a single joint signal: it fires only when *both*
 * the name and company floors are crossed together, never from one alone —
 * so it appears as one receipt row, not two.
 *
 * Raw score, ungated by any tier — separated from `buildContactEdge` below
 * so the sweep's weight-monotonicity check can compare scores for pairs that
 * never clear the `possible` floor at all.
 */
export function scoreContactPair(a: Contact, b: Contact, weights: ContactSignalWeights): PairScore {
  const signals: MatchSignal[] = [];
  let score = 0;

  const emailA = normalizeEmail(a.email);
  const emailB = normalizeEmail(b.email);
  if (emailA === emailB) {
    score += weights.emailExact;
    signals.push({ signal: "emailExact", points: weights.emailExact, detail: `${emailA} = ${emailB}` });
  }

  const phoneA = normalizePhone(a.phone);
  const phoneB = normalizePhone(b.phone);
  if (phoneA === phoneB) {
    score += weights.phoneExact;
    signals.push({ signal: "phoneExact", points: weights.phoneExact, detail: `${phoneA} = ${phoneB}` });
  }

  if (a.linkedinUrl != null && b.linkedinUrl != null) {
    const liA = normalizeLinkedin(a.linkedinUrl);
    const liB = normalizeLinkedin(b.linkedinUrl);
    if (liA === liB) {
      score += weights.linkedinExact;
      signals.push({ signal: "linkedinExact", points: weights.linkedinExact, detail: `${liA} = ${liB}` });
    }
  }

  const nameSim = similarity(
    normalizeContactName(`${a.firstName} ${a.lastName}`),
    normalizeContactName(`${b.firstName} ${b.lastName}`),
  );
  const companySim = similarity(normalizeCompanyName(a.company), normalizeCompanyName(b.company));
  if (nameSim >= weights.nameFloor && companySim >= weights.companyFloor) {
    const pairScore = Math.round(weights.nameMax * nameSim + weights.companyMax * companySim);
    score += pairScore;
    signals.push({
      signal: "namePlusCompany",
      points: pairScore,
      detail: `name ${pct(nameSim)} (floor ${pct(weights.nameFloor)}) + company ${pct(companySim)} (floor ${pct(weights.companyFloor)})`,
    });
  }

  return { score, signals };
}

export function buildContactEdge(
  a: Contact,
  b: Contact,
  weights: ContactSignalWeights,
  tiers: { high: number; possible: number },
): MatchEdge | null {
  const { score, signals } = scoreContactPair(a, b, weights);
  if (score < tiers.possible) return null;
  return {
    sourceId: a.id,
    targetId: b.id,
    score,
    tier: score >= tiers.high ? "high" : "possible",
    signals,
  };
}

/**
 * `score = domainExact + phoneExact + nameScore + addressScore` (PLAN.md §
 * Method). Name and address are independent signals here, not a joint pair —
 * each contributes on its own once it clears its own floor.
 *
 * Raw score, ungated by any tier — see `scoreContactPair` above.
 */
export function scoreAccountPair(a: Account, b: Account, weights: AccountSignalWeights): PairScore {
  const signals: MatchSignal[] = [];
  let score = 0;

  const domainA = normalizeDomain(a.domain);
  const domainB = normalizeDomain(b.domain);
  if (domainA === domainB) {
    score += weights.domainExact;
    signals.push({ signal: "domainExact", points: weights.domainExact, detail: `${domainA} = ${domainB}` });
  }

  const phoneA = normalizePhone(a.phone);
  const phoneB = normalizePhone(b.phone);
  if (phoneA === phoneB) {
    score += weights.phoneExact;
    signals.push({ signal: "phoneExact", points: weights.phoneExact, detail: `${phoneA} = ${phoneB}` });
  }

  const nameSim = similarity(normalizeCompanyName(a.name), normalizeCompanyName(b.name));
  if (nameSim >= weights.nameFloor) {
    const nameScore = Math.round(weights.nameMax * nameSim);
    score += nameScore;
    signals.push({
      signal: "nameFuzzy",
      points: nameScore,
      detail: `name ${pct(nameSim)} (floor ${pct(weights.nameFloor)})`,
    });
  }

  const addressSim = similarity(normalizeAddress(a.address), normalizeAddress(b.address));
  if (addressSim >= weights.addressFloor) {
    const addressScore = Math.round(weights.addressMax * addressSim);
    score += addressScore;
    signals.push({
      signal: "addressFuzzy",
      points: addressScore,
      detail: `address ${pct(addressSim)} (floor ${pct(weights.addressFloor)})`,
    });
  }

  return { score, signals };
}

export function buildAccountEdge(
  a: Account,
  b: Account,
  weights: AccountSignalWeights,
  tiers: { high: number; possible: number },
): MatchEdge | null {
  const { score, signals } = scoreAccountPair(a, b, weights);
  if (score < tiers.possible) return null;
  return {
    sourceId: a.id,
    targetId: b.id,
    score,
    tier: score >= tiers.high ? "high" : "possible",
    signals,
  };
}
