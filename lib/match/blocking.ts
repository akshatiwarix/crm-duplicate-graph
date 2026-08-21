import type { Contact } from "@/lib/domain/contact";
import type { Account } from "@/lib/domain/account";
import {
  normalizeEmail,
  normalizePhone,
  normalizeContactName,
  normalizeCompanyName,
  normalizeLinkedin,
  normalizeDomain,
} from "./normalize";

/**
 * Blocking keys, verbatim from PLAN.md § Method. Each key is prefixed by its
 * kind so an email bucket can never collide with a name bucket that happens
 * to share the same literal text.
 */
export function contactBlockKeys(c: Contact): string[] {
  const keys: string[] = [];

  const email = normalizeEmail(c.email);
  if (email) keys.push(`email:${email}`);

  const phone = normalizePhone(c.phone);
  if (phone.length >= 6) keys.push(`phone6:${phone.slice(-6)}`);

  const last3 = normalizeContactName(c.lastName).slice(0, 3);
  const first1 = normalizeContactName(c.firstName).slice(0, 1);
  if (last3 && first1) keys.push(`name:${last3}${first1}`);

  if (c.linkedinUrl != null) keys.push(`linkedin:${normalizeLinkedin(c.linkedinUrl)}`);

  return keys;
}

export function accountBlockKeys(a: Account): string[] {
  const keys: string[] = [];

  const domain = normalizeDomain(a.domain);
  if (domain) keys.push(`domain:${domain}`);

  const phone = normalizePhone(a.phone);
  if (phone.length >= 6) keys.push(`phone6:${phone.slice(-6)}`);

  const name4 = normalizeCompanyName(a.name).slice(0, 4);
  if (name4) keys.push(`name4:${name4}`);

  return keys;
}

/**
 * The union of every pair sharing at least one blocking key, deduplicated.
 * Naive all-pairs is never run against the full corpus — see
 * `bruteForcePairs` below, used only by the sweep's blocking-completeness
 * check on a small held-out sample.
 */
export function candidatePairs<T extends { id: string }>(
  records: readonly T[],
  keyFn: (record: T) => string[],
): Array<[string, string]> {
  const buckets = new Map<string, string[]>();
  for (const record of records) {
    for (const key of keyFn(record)) {
      const bucket = buckets.get(key);
      if (bucket) bucket.push(record.id);
      else buckets.set(key, [record.id]);
    }
  }

  const seen = new Set<string>();
  const pairs: Array<[string, string]> = [];
  for (const ids of buckets.values()) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const idA = ids[i];
        const idB = ids[j];
        if (!idA || !idB) continue;
        const pair: [string, string] = idA < idB ? [idA, idB] : [idB, idA];
        const pairKey = `${pair[0]}|${pair[1]}`;
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);
        pairs.push(pair);
      }
    }
  }
  return pairs;
}

/** Every unordered pair, no blocking — the brute-force reference for the sweep's completeness check. */
export function bruteForcePairs<T extends { id: string }>(records: readonly T[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const idA = records[i]?.id;
      const idB = records[j]?.id;
      if (!idA || !idB) continue;
      pairs.push(idA < idB ? [idA, idB] : [idB, idA]);
    }
  }
  return pairs;
}
