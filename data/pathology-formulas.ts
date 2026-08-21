/**
 * A self-contained copy of the normalization/similarity/scoring formulas from
 * PLAN.md § Method, used only to construct and self-verify the four planted
 * pathologies at corpus-generation time.
 *
 * data/ cannot depend on lib/match (not built yet — the dependency order in
 * PLAN.md's task list only ever points downward), so the formulas are
 * inlined here and re-asserted independently against the real
 * implementation once lib/match exists (same pattern as sibling repo
 * tam-calculator's data/generate.ts inlining isQualifying ahead of
 * lib/qualify).
 */
import { distance } from "fastest-levenshtein";
import type { Contact } from "@/lib/domain/contact";
import type { Account } from "@/lib/domain/account";
import type { ContactSignalWeights, AccountSignalWeights } from "@/lib/domain/weights";

export function normalizeEmail(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  const at = trimmed.indexOf("@");
  if (at === -1) return trimmed.replace(/\./g, "");
  let local = trimmed.slice(0, at);
  const domainPart = trimmed.slice(at);
  const plus = local.indexOf("+");
  if (plus !== -1) local = local.slice(0, plus);
  local = local.replace(/\./g, "");
  return local + domainPart;
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.slice(-10);
}

export function normalizeContactName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

// See lib/match/normalize.ts for why the period sits before a lookahead
// rather than `\b` (otherwise "Acme Corp." -> "acme ." instead of "acme").
const LEGAL_SUFFIX_RE = /\b(inc|llc|ltd|corp|co|company)\.?(?=\s|$)/g;

export function normalizeCompanyName(raw: string): string {
  const lowered = raw.trim().toLowerCase();
  const stripped = lowered.replace(LEGAL_SUFFIX_RE, " ");
  return stripped.replace(/\s+/g, " ").trim();
}

export function normalizeLinkedin(raw: string): string {
  let s = raw.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "");
  s = s.replace(/^www\./, "");
  s = s.replace(/\/+$/, "");
  return s;
}

export function normalizeDomain(raw: string): string {
  let s = raw.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "");
  s = s.replace(/^www\./, "");
  const slash = s.indexOf("/");
  if (slash !== -1) s = s.slice(0, slash);
  return s;
}

const STREET_SUFFIX_MAP: Record<string, string> = {
  street: "st",
  avenue: "ave",
  road: "rd",
  boulevard: "blvd",
};

export function normalizeAddress(raw: string): string {
  // Commas are formatting noise ("123 Main St, Springfield, IL") that would
  // otherwise stick to the street-suffix word and block the canonicalization
  // lookup below.
  const s = raw.trim().toLowerCase().replace(/,/g, "").replace(/\s+/g, " ");
  const words = s.split(" ").map((w) => {
    const bare = w.replace(/\.$/, "");
    return STREET_SUFFIX_MAP[bare] ?? bare;
  });
  return words.join(" ").trim();
}

export function similarity(a: string, b: string): number {
  const len = Math.max(a.length, b.length, 1);
  return 1 - distance(a, b) / len;
}

export function contactFullName(c: Pick<Contact, "firstName" | "lastName">): string {
  return `${c.firstName} ${c.lastName}`;
}

export function scoreContactPair(a: Contact, b: Contact, weights: ContactSignalWeights) {
  const emailEq = normalizeEmail(a.email) === normalizeEmail(b.email);
  const phoneEq = normalizePhone(a.phone) === normalizePhone(b.phone);
  const linkedinEq =
    a.linkedinUrl != null && b.linkedinUrl != null
      ? normalizeLinkedin(a.linkedinUrl) === normalizeLinkedin(b.linkedinUrl)
      : false;
  const nameSim = similarity(
    normalizeContactName(contactFullName(a)),
    normalizeContactName(contactFullName(b)),
  );
  const companySim = similarity(normalizeCompanyName(a.company), normalizeCompanyName(b.company));
  const pairScore =
    nameSim >= weights.nameFloor && companySim >= weights.companyFloor
      ? Math.round(weights.nameMax * nameSim + weights.companyMax * companySim)
      : 0;
  const score =
    (emailEq ? weights.emailExact : 0) +
    (phoneEq ? weights.phoneExact : 0) +
    (linkedinEq ? weights.linkedinExact : 0) +
    pairScore;
  return { score, nameSim, companySim, emailEq, phoneEq, linkedinEq, pairScore };
}

export function scoreAccountPair(a: Account, b: Account, weights: AccountSignalWeights) {
  const domainEq = normalizeDomain(a.domain) === normalizeDomain(b.domain);
  const phoneEq = normalizePhone(a.phone) === normalizePhone(b.phone);
  const nameSim = similarity(normalizeCompanyName(a.name), normalizeCompanyName(b.name));
  const addressSim = similarity(normalizeAddress(a.address), normalizeAddress(b.address));
  const nameScore = nameSim >= weights.nameFloor ? Math.round(weights.nameMax * nameSim) : 0;
  const addressScore = addressSim >= weights.addressFloor ? Math.round(weights.addressMax * addressSim) : 0;
  const score = (domainEq ? weights.domainExact : 0) + (phoneEq ? weights.phoneExact : 0) + nameScore + addressScore;
  return { score, nameSim, addressSim, domainEq, phoneEq, nameScore, addressScore };
}
