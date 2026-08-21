/**
 * Normalization rules, verbatim from PLAN.md § Method. Every function here is
 * pure and deterministic — same input, same output, no locale/timezone/host
 * dependence — so it can run identically in the browser and in the API route.
 */

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

// `\.?` before a lookahead (rather than `\b`) so a trailing period is
// actually consumed — `\b` alone is satisfied without it (boundary already
// exists between the suffix word and a following "."), which used to leave
// a dangling " ." behind after stripping ("Acme Corp." -> "acme .").
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
