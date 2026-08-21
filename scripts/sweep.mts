/**
 * The sweep: nine invariants over a cross-product of configurations, no
 * network (PLAN.md § Validation / test plan).
 *
 * This is not a slower `npm test`. Monotonicity, entity-type isolation, and
 * blocking completeness are cross-configuration properties — no single unit
 * test can express them, and they are the only checks that would catch a
 * real number that is quietly wrong across the space rather than at one
 * hand-picked point.
 */
import { getContacts } from "@/data/contacts";
import { getAccounts } from "@/data/accounts";
import {
  CONTACT_TWINS_IDS,
  CONTACT_CHAIN_IDS,
  CONTACT_IMPOSTER_IDS,
  CONTACT_GHOST_IDS,
  ACCOUNT_TWINS_IDS,
  ACCOUNT_CHAIN_IDS,
  ACCOUNT_IMPOSTER_IDS,
  ACCOUNT_GHOST_IDS,
} from "@/data/generate";
import { DEFAULT_CONFIG, DEFAULT_CORPUS_ID } from "@/lib/domain/defaults";
import type { Config } from "@/lib/domain/config";
import type { Contact } from "@/lib/domain/contact";
import type { Account } from "@/lib/domain/account";
import {
  matchContacts,
  matchAccounts,
  scoreContactPair,
  scoreAccountPair,
  buildContactEdge,
  buildAccountEdge,
  contactBlockKeys,
  accountBlockKeys,
  candidatePairs,
  bruteForcePairs,
} from "@/lib/match";
import { computeDedupeResult } from "@/lib/compute";

const started = Date.now();

type Failure = { invariant: string; detail: string };
const failures: Failure[] = [];
let checks = 0;

function check(invariant: string, ok: boolean, detail: () => string): void {
  checks++;
  if (!ok) failures.push({ invariant, detail: detail() });
}

function withConfig(mutate: (c: Config) => void): Config {
  const config = structuredClone(DEFAULT_CONFIG);
  mutate(config);
  return config;
}

const contacts = getContacts(DEFAULT_CORPUS_ID);
const accounts = getAccounts(DEFAULT_CORPUS_ID);

/* ------------------------------------------------------------------ *
 * 1 · Determinism — same corpus + Config -> byte-identical DedupeResult.
 * ------------------------------------------------------------------ */

{
  const a = computeDedupeResult(DEFAULT_CONFIG, { contacts, accounts });
  const b = computeDedupeResult(structuredClone(DEFAULT_CONFIG), { contacts, accounts });
  check("1 · determinism", JSON.stringify(a) === JSON.stringify(b), () => "same config produced different DedupeResult");
}

/* ------------------------------------------------------------------ *
 * 2 · Weight monotonicity — increasing any single signal weight never
 *     decreases a pair's raw score. Checked over every blocked candidate
 *     pair in the full corpus, per weight field.
 * ------------------------------------------------------------------ */

{
  const contactPairs = candidatePairs(contacts, contactBlockKeys);
  const byContactId = new Map(contacts.map((c) => [c.id, c]));
  const contactWeightFields = ["emailExact", "phoneExact", "linkedinExact", "nameMax", "companyMax"] as const;

  for (const field of contactWeightFields) {
    const bumped = withConfig((c) => {
      c.weights.contact[field] += 20;
    });
    for (const [idA, idB] of contactPairs) {
      const a = byContactId.get(idA);
      const b = byContactId.get(idB);
      if (!a || !b) continue;
      const base = scoreContactPair(a, b, DEFAULT_CONFIG.weights.contact).score;
      const after = scoreContactPair(a, b, bumped.weights.contact).score;
      check(
        "2 · weight monotonicity (contact)",
        after >= base,
        () => `${field}: ${idA}-${idB} went ${base} -> ${after}`,
      );
    }
  }

  const accountPairs = candidatePairs(accounts, accountBlockKeys);
  const byAccountId = new Map(accounts.map((a) => [a.id, a]));
  const accountWeightFields = ["domainExact", "phoneExact", "nameMax", "addressMax"] as const;

  for (const field of accountWeightFields) {
    const bumped = withConfig((c) => {
      c.weights.account[field] += 20;
    });
    for (const [idA, idB] of accountPairs) {
      const a = byAccountId.get(idA);
      const b = byAccountId.get(idB);
      if (!a || !b) continue;
      const base = scoreAccountPair(a, b, DEFAULT_CONFIG.weights.account).score;
      const after = scoreAccountPair(a, b, bumped.weights.account).score;
      check(
        "2 · weight monotonicity (account)",
        after >= base,
        () => `${field}: ${idA}-${idB} went ${base} -> ${after}`,
      );
    }
  }
}

/* ------------------------------------------------------------------ *
 * 3 · Tier-threshold monotonicity — raising a `high` or `possible` cutoff
 *     never increases the count of edges classified at or above it.
 * ------------------------------------------------------------------ */

{
  const baseContactEdges = matchContacts(contacts, DEFAULT_CONFIG.weights.contact, DEFAULT_CONFIG.tiers.contact);
  const baseAccountEdges = matchAccounts(accounts, DEFAULT_CONFIG.weights.account, DEFAULT_CONFIG.tiers.account);

  for (const bump of [5, 20]) {
    const raisedPossible = withConfig((c) => {
      c.tiers.contact.possible += bump;
    });
    const edgesAfter = matchContacts(contacts, raisedPossible.weights.contact, raisedPossible.tiers.contact);
    check(
      "3 · tier-threshold monotonicity (contact possible)",
      edgesAfter.length <= baseContactEdges.length,
      () => `possible +${bump}: ${baseContactEdges.length} -> ${edgesAfter.length} edges`,
    );

    const raisedHigh = withConfig((c) => {
      c.tiers.contact.high += bump;
    });
    const highBefore = baseContactEdges.filter((e) => e.tier === "high").length;
    const edgesAfterHigh = matchContacts(contacts, raisedHigh.weights.contact, raisedHigh.tiers.contact);
    const highAfter = edgesAfterHigh.filter((e) => e.tier === "high").length;
    check(
      "3 · tier-threshold monotonicity (contact high)",
      highAfter <= highBefore,
      () => `high +${bump}: ${highBefore} -> ${highAfter} high-tier edges`,
    );

    const raisedAccountPossible = withConfig((c) => {
      c.tiers.account.possible += bump;
    });
    const accountEdgesAfter = matchAccounts(accounts, raisedAccountPossible.weights.account, raisedAccountPossible.tiers.account);
    check(
      "3 · tier-threshold monotonicity (account possible)",
      accountEdgesAfter.length <= baseAccountEdges.length,
      () => `possible +${bump}: ${baseAccountEdges.length} -> ${accountEdgesAfter.length} edges`,
    );

    const raisedAccountHigh = withConfig((c) => {
      c.tiers.account.high += bump;
    });
    const accountHighBefore = baseAccountEdges.filter((e) => e.tier === "high").length;
    const accountEdgesAfterHigh = matchAccounts(accounts, raisedAccountHigh.weights.account, raisedAccountHigh.tiers.account);
    const accountHighAfter = accountEdgesAfterHigh.filter((e) => e.tier === "high").length;
    check(
      "3 · tier-threshold monotonicity (account high)",
      accountHighAfter <= accountHighBefore,
      () => `high +${bump}: ${accountHighBefore} -> ${accountHighAfter} high-tier edges`,
    );
  }
}

/* ------------------------------------------------------------------ *
 * 4 · Floor monotonicity — raising a fuzzy floor never increases total
 *     edge count.
 * ------------------------------------------------------------------ */

{
  const baseContactCount = matchContacts(contacts, DEFAULT_CONFIG.weights.contact, DEFAULT_CONFIG.tiers.contact).length;
  for (const field of ["nameFloor", "companyFloor"] as const) {
    const raised = withConfig((c) => {
      c.weights.contact[field] = Math.min(1, c.weights.contact[field] + 0.1);
    });
    const afterCount = matchContacts(contacts, raised.weights.contact, raised.tiers.contact).length;
    check(
      "4 · floor monotonicity (contact)",
      afterCount <= baseContactCount,
      () => `${field} +0.1: ${baseContactCount} -> ${afterCount} edges`,
    );
  }

  const baseAccountCount = matchAccounts(accounts, DEFAULT_CONFIG.weights.account, DEFAULT_CONFIG.tiers.account).length;
  for (const field of ["nameFloor", "addressFloor"] as const) {
    const raised = withConfig((c) => {
      c.weights.account[field] = Math.min(1, c.weights.account[field] + 0.1);
    });
    const afterCount = matchAccounts(accounts, raised.weights.account, raised.tiers.account).length;
    check(
      "4 · floor monotonicity (account)",
      afterCount <= baseAccountCount,
      () => `${field} +0.1: ${baseAccountCount} -> ${afterCount} edges`,
    );
  }
}

/* ------------------------------------------------------------------ *
 * 5 · Symmetry — score(A,B) === score(B,A) for every candidate pair.
 * ------------------------------------------------------------------ */

{
  const byContactId = new Map(contacts.map((c) => [c.id, c]));
  for (const [idA, idB] of candidatePairs(contacts, contactBlockKeys)) {
    const a = byContactId.get(idA);
    const b = byContactId.get(idB);
    if (!a || !b) continue;
    const ab = scoreContactPair(a, b, DEFAULT_CONFIG.weights.contact).score;
    const ba = scoreContactPair(b, a, DEFAULT_CONFIG.weights.contact).score;
    check("5 · symmetry (contact)", ab === ba, () => `${idA}-${idB}: ${ab} vs ${ba}`);
  }

  const byAccountId = new Map(accounts.map((a) => [a.id, a]));
  for (const [idA, idB] of candidatePairs(accounts, accountBlockKeys)) {
    const a = byAccountId.get(idA);
    const b = byAccountId.get(idB);
    if (!a || !b) continue;
    const ab = scoreAccountPair(a, b, DEFAULT_CONFIG.weights.account).score;
    const ba = scoreAccountPair(b, a, DEFAULT_CONFIG.weights.account).score;
    check("5 · symmetry (account)", ab === ba, () => `${idA}-${idB}: ${ab} vs ${ba}`);
  }
}

/* ------------------------------------------------------------------ *
 * 6 · Cluster partition — no record in two clusters within the same
 *     entity type; every cluster has 2+ distinct record ids.
 * ------------------------------------------------------------------ */

{
  const result = computeDedupeResult(DEFAULT_CONFIG, { contacts, accounts });
  for (const [label, clusters] of [
    ["contact", result.contactClusters],
    ["account", result.accountClusters],
  ] as const) {
    const seen = new Set<string>();
    for (const cluster of clusters) {
      check("6 · cluster partition (size)", cluster.recordIds.length >= 2, () => `${label} cluster ${cluster.id} has < 2 records`);
      for (const id of cluster.recordIds) {
        check("6 · cluster partition (no overlap)", !seen.has(id), () => `${label} record ${id} appears in two clusters`);
        seen.add(id);
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * 7 · Entity-type isolation — changing any contact weight/floor/tier
 *     never changes accountClusters, and vice versa.
 * ------------------------------------------------------------------ */

{
  const baseline = computeDedupeResult(DEFAULT_CONFIG, { contacts, accounts });

  const contactMutations: Array<(c: Config) => void> = [
    (c) => { c.weights.contact.emailExact += 25; },
    (c) => { c.weights.contact.nameFloor = 0.5; },
    (c) => { c.tiers.contact.possible = 10; },
    (c) => { c.tiers.contact.high = 200; },
  ];
  for (const mutate of contactMutations) {
    const result = computeDedupeResult(withConfig(mutate), { contacts, accounts });
    check(
      "7 · entity-type isolation (contact -> account)",
      JSON.stringify(result.accountClusters) === JSON.stringify(baseline.accountClusters),
      () => "a contact-only config change altered accountClusters",
    );
  }

  const accountMutations: Array<(c: Config) => void> = [
    (c) => { c.weights.account.domainExact += 25; },
    (c) => { c.weights.account.nameFloor = 0.5; },
    (c) => { c.tiers.account.possible = 5; },
    (c) => { c.tiers.account.high = 200; },
  ];
  for (const mutate of accountMutations) {
    const result = computeDedupeResult(withConfig(mutate), { contacts, accounts });
    check(
      "7 · entity-type isolation (account -> contact)",
      JSON.stringify(result.contactClusters) === JSON.stringify(baseline.contactClusters),
      () => "an account-only config change altered contactClusters",
    );
  }
}

/* ------------------------------------------------------------------ *
 * 8 · Blocking completeness — on a held-out stratified sample, candidate
 *     pairs found via blocking are a superset of the true matches (score
 *     >= possible) found via brute-force all-pairs on that sample.
 * ------------------------------------------------------------------ */

{
  const pathologyContactIds = new Set<string>([
    ...CONTACT_TWINS_IDS,
    ...CONTACT_CHAIN_IDS,
    ...CONTACT_IMPOSTER_IDS,
    ...CONTACT_GHOST_IDS,
  ]);
  const contactSample: Contact[] = contacts.filter((c, i) => i % 10 === 0 || pathologyContactIds.has(c.id));

  const blockedContactPairs = new Set(candidatePairs(contactSample, contactBlockKeys).map(([a, b]) => `${a}|${b}`));
  const byContactId = new Map(contactSample.map((c) => [c.id, c]));
  let contactTrueMatches = 0;
  for (const [idA, idB] of bruteForcePairs(contactSample)) {
    const a = byContactId.get(idA);
    const b = byContactId.get(idB);
    if (!a || !b) continue;
    const edge = buildContactEdge(a, b, DEFAULT_CONFIG.weights.contact, DEFAULT_CONFIG.tiers.contact);
    if (!edge) continue;
    contactTrueMatches++;
    check(
      "8 · blocking completeness (contact)",
      blockedContactPairs.has(`${idA}|${idB}`),
      () => `true match ${idA}-${idB} (score ${edge.score}) missing from blocked candidates`,
    );
  }
  check("8 · blocking completeness (contact sample non-trivial)", contactTrueMatches > 0, () => "sample produced zero true matches — invariant not exercised");

  const pathologyAccountIds = new Set<string>([
    ...ACCOUNT_TWINS_IDS,
    ...ACCOUNT_CHAIN_IDS,
    ...ACCOUNT_IMPOSTER_IDS,
    ...ACCOUNT_GHOST_IDS,
  ]);
  const accountSample: Account[] = accounts.filter((a, i) => i % 5 === 0 || pathologyAccountIds.has(a.id));

  const blockedAccountPairs = new Set(candidatePairs(accountSample, accountBlockKeys).map(([a, b]) => `${a}|${b}`));
  const byAccountId = new Map(accountSample.map((a) => [a.id, a]));
  let accountTrueMatches = 0;
  for (const [idA, idB] of bruteForcePairs(accountSample)) {
    const a = byAccountId.get(idA);
    const b = byAccountId.get(idB);
    if (!a || !b) continue;
    const edge = buildAccountEdge(a, b, DEFAULT_CONFIG.weights.account, DEFAULT_CONFIG.tiers.account);
    if (!edge) continue;
    accountTrueMatches++;
    check(
      "8 · blocking completeness (account)",
      blockedAccountPairs.has(`${idA}|${idB}`),
      () => `true match ${idA}-${idB} (score ${edge.score}) missing from blocked candidates`,
    );
  }
  check("8 · blocking completeness (account sample non-trivial)", accountTrueMatches > 0, () => "sample produced zero true matches — invariant not exercised");
}

/* ------------------------------------------------------------------ *
 * 9 · Pathology persistence — at default Config, THE TWINS/CHAIN/
 *     IMPOSTER/GHOST each produce their documented outcome through the
 *     real match + cluster pipeline, for both entity types.
 * ------------------------------------------------------------------ */

{
  const byContactId = new Map(contacts.map((c) => [c.id, c]));
  const byAccountId = new Map(accounts.map((a) => [a.id, a]));
  const cw = DEFAULT_CONFIG.weights.contact;
  const ct = DEFAULT_CONFIG.tiers.contact;
  const aw = DEFAULT_CONFIG.weights.account;
  const at = DEFAULT_CONFIG.tiers.account;
  const result = computeDedupeResult(DEFAULT_CONFIG, { contacts, accounts });

  function clusterContaining(clusters: typeof result.contactClusters, id: string) {
    return clusters.find((c) => c.recordIds.includes(id));
  }

  // THE TWINS: high tier, both entity types.
  {
    const [idA, idB] = CONTACT_TWINS_IDS;
    const a = byContactId.get(idA)!;
    const b = byContactId.get(idB)!;
    const edge = buildContactEdge(a, b, cw, ct);
    check("9 · pathology persistence (contact TWINS)", edge?.tier === "high", () => `edge=${JSON.stringify(edge)}`);
  }
  {
    const [idA, idB] = ACCOUNT_TWINS_IDS;
    const a = byAccountId.get(idA)!;
    const b = byAccountId.get(idB)!;
    const edge = buildAccountEdge(a, b, aw, at);
    check("9 · pathology persistence (account TWINS)", edge?.tier === "high", () => `edge=${JSON.stringify(edge)}`);
  }

  // THE CHAIN: all three cluster together via the real union-find pipeline.
  {
    const [idA, idB, idC] = CONTACT_CHAIN_IDS;
    const cluster = clusterContaining(result.contactClusters, idA);
    check(
      "9 · pathology persistence (contact CHAIN)",
      cluster != null && [idA, idB, idC].every((id) => cluster.recordIds.includes(id)),
      () => `cluster=${JSON.stringify(cluster)}`,
    );
  }
  {
    const [idA, idB, idC] = ACCOUNT_CHAIN_IDS;
    const cluster = clusterContaining(result.accountClusters, idA);
    check(
      "9 · pathology persistence (account CHAIN)",
      cluster != null && [idA, idB, idC].every((id) => cluster.recordIds.includes(id)),
      () => `cluster=${JSON.stringify(cluster)}`,
    );
  }

  // THE IMPOSTER: no edge at all.
  {
    const [idA, idB] = CONTACT_IMPOSTER_IDS;
    const edge = buildContactEdge(byContactId.get(idA)!, byContactId.get(idB)!, cw, ct);
    check("9 · pathology persistence (contact IMPOSTER)", edge === null, () => `edge=${JSON.stringify(edge)}`);
  }
  {
    const [idA, idB] = ACCOUNT_IMPOSTER_IDS;
    const edge = buildAccountEdge(byAccountId.get(idA)!, byAccountId.get(idB)!, aw, at);
    check("9 · pathology persistence (account IMPOSTER)", edge === null, () => `edge=${JSON.stringify(edge)}`);
  }

  // THE GHOST: possible tier, not high.
  {
    const [idA, idB] = CONTACT_GHOST_IDS;
    const edge = buildContactEdge(byContactId.get(idA)!, byContactId.get(idB)!, cw, ct);
    check("9 · pathology persistence (contact GHOST)", edge?.tier === "possible", () => `edge=${JSON.stringify(edge)}`);
  }
  {
    const [idA, idB] = ACCOUNT_GHOST_IDS;
    const edge = buildAccountEdge(byAccountId.get(idA)!, byAccountId.get(idB)!, aw, at);
    check("9 · pathology persistence (account GHOST)", edge?.tier === "possible", () => `edge=${JSON.stringify(edge)}`);
  }
}

/* ------------------------------------------------------------------ */

const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log(`\nsweep: ${checks} checks, ${seconds}s`);

if (failures.length > 0) {
  console.log(`\n${failures.length} FAILURES:`);
  const byInvariant = new Map<string, Failure[]>();
  for (const failure of failures) {
    byInvariant.set(failure.invariant, [...(byInvariant.get(failure.invariant) ?? []), failure]);
  }
  for (const [invariant, list] of byInvariant) {
    console.log(`\n  ${invariant} — ${list.length}`);
    for (const failure of list.slice(0, 5)) console.log(`    ${failure.detail}`);
    if (list.length > 5) console.log(`    ... and ${list.length - 5} more`);
  }
  process.exit(1);
}

console.log("\nall nine invariants hold.");
