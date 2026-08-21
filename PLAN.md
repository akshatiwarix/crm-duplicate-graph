# Day 018 — CRM Duplicate Graph — Implementation Plan

> This file is the contract. It was settled before any code was written, through a
> structured grilling session, and it is not a starting point to improve on. If the
> code contradicts this file, the code is wrong. If this file needs to change, it
> changes here first, in writing, with the reason.

**Repo:** `crm-duplicate-graph` · **Day:** 018 of 100 · **Time limit:** one day
**Brief (fixed by the master plan):** *A visual system for showing likely duplicate
contacts/accounts and the relationships that caused the match.*
**Portfolio angle:** entity resolution, graph thinking, CRM hygiene.

---

## Problem

CRM dedupe tools exist. Most of them fail the same four ways.

**1. A match score with no receipt is not explainable, so it isn't trusted.** "87%
match" tells an admin nothing about *why* — was it the email, the phone, a fuzzy name
guess? Without the breakdown, a human either blindly accepts every flagged pair or
blindly ignores all of them. Neither is CRM hygiene.

**2. Duplicates aren't pairs, they're clusters, and pairwise tools miss the chain.**
Record A and B share a phone number. B and C share an email. A and C share nothing
directly. A tool that only compares pairs reports two disconnected "maybe" flags and
requires a human to notice they're the same underlying mess. The graph — connected
components over a match graph, not a list of pairs — is the only structure that gets
this right natively.

**3. Aggressive fuzzy matching creates false positives, and a false merge destroys
data.** Two different people with similar names, two different companies with similar
names — a dedupe tool tuned purely for recall will merge them. A responsible tool has
to show it can hold a precision floor: two clearly-similar records that are
*correctly* refused a match, on purpose, because the corroborating signals disagree.

**4. Naive all-pairs comparison doesn't scale, and blocking strategies are usually a
silent, unverified assumption.** Comparing every record to every other record is
O(n²) and real CRMs have hundreds of thousands of records. Tools add a "blocking"
prefilter to cut the comparison set — but almost never check whether that filter
silently drops true duplicates to save compute. That should be a checked invariant,
not a hope.

This repo's subject is those four gaps.

### What this repo is not

- **Not a CRM integration.** No HubSpot, no Salesforce, no OAuth. The input is a
  committed synthetic corpus.
- **Not a merge/write tool.** Detection, scoring, explanation, and visualization
  only. No data mutation, no "confirm merge" action, no persistence.
- **Not cross-entity resolution.** Contacts and accounts are two independent dedupe
  problems, run and displayed separately. No attempt to link a contact to "its"
  account or use one entity type to corroborate a match in the other — a contact's
  `company` field is a free-text string, not a foreign key.
- **Not an AI/ML matching system.** Zero model calls. Every score is a documented
  deterministic formula (weighted signals + a normalized edit-distance similarity),
  auditable line by line.
- **Not internationalized.** Phone normalization assumes a single format (last 10
  digits, US-style); address normalization assumes English street-suffix
  abbreviations. A named scope limit, not an oversight.

---

## Intended user

A RevOps or data-ops analyst deciding whether a dedupe pass on their CRM is safe to
run, who currently has no way to see *why* two records were flagged together, whether
a "cluster" is one real transitive chain or a coincidence, or whether the matching
logic would confidently merge two records that are actually different people.

Secondary user: an interviewer or engineer reading the repo, who should be able to
see the normalization rules, the scoring formula, and the clustering logic without
running anything.

---

## User journey

1. Land on the console. The synthetic corpus is already loaded, default weights and
   tiers are already applied, clusters are already computed. No upload, no sign-up,
   no key.
2. **Cluster list**: browse contact and account clusters (toggle entity type), ranked
   by strongest edge tier then size.
3. Select a cluster: **Graph view** renders it as a force-directed subgraph — nodes
   are records, edges are candidate matches, styled by tier (High / Possible).
4. Click an edge: **Record detail** shows the two records' fields side by side, plus
   the scoring receipt — every signal that fired, its point contribution, and the
   total against the tier cutoffs.
5. Open **Controls**: drag a weight or a tier threshold and watch clusters recompute
   live, client-side — including watching a borderline cluster cross in or out of the
   Possible tier as a fuzzy floor moves.
6. Copy the permalink. It round-trips the exact same clusters.

---

## MVP scope

**In:**

- Seeded synthetic corpus: ~2,000 contacts and ~500 accounts, fixed seed, four named
  pathologies planted in **both** entity types, committed to the repo as JSON.
- Deterministic weighted-signal matching for both entity types, exact formulas (see
  *Method*).
- Multi-key blocking to avoid naive all-pairs comparison.
- Two-tier confidence per edge (High / Possible), both the weights and the tier
  cutoffs user-adjustable.
- Union-find connected-components clustering — transitive, not pairwise.
- Per-edge explainability receipt: every signal, its point contribution, the total.
- Console: four sections — cluster list, graph view (`d3-force`), record detail,
  weight/threshold controls — permalink-driven, live client-side recompute.
- `POST /api/v1/dedupe`, `GET /api/schema`, permalink codec.
- `npm run sweep`: nine invariants over a cross-product, no network.

**Out (explicitly):**

- Uploading your own CRM export.
- Any merge/write action — no data mutation.
- Cross-entity (contact ↔ account) matching or linkage.
- Any real CRM API integration.
- Non-US phone or address normalization.
- Any model call.
- CSV export (cheap to add, but not part of what was scoped — see *Post-MVP*).

---

## Stack

Identical to the sibling repos, deliberately.

- **Next.js** (App Router), **React**, **TypeScript** strict with
  `noUncheckedIndexedAccess`.
- **Tailwind CSS 4**.
- **zod** for every boundary — API input, corpus load, permalink decode.
- **vitest** for unit tests, **vite-node** for the sweep and corpus scripts.
- **Vercel** for deployment.
- **`d3-force`** (simulation only, not the full `d3` bundle) for the graph layout —
  the one deliberate departure from the "no library" convention, because a real force
  simulation is out of scope to hand-roll in a one-day build. Nodes/edges are still
  rendered as plain SVG/React, styled by hand.
- **`fastest-levenshtein`** for the fuzzy-string primitive — a small, well-maintained
  edit-distance function. Similarity is derived from it (see *Method*), not imported
  as a black box.

---

## Data sources

**A single committed synthetic corpus**, generated by `data/generate.ts` from a fixed
seed, checked into the repo as JSON.

Real CRM data was considered and rejected for the same reason as Day 017: this tool's
claims are about *structure* — transitive clustering, precision under a false-positive
trap, blocking correctness — and those are properties of the shape of a match graph,
not of whose name is on the record. The generator is committed, the seed is fixed,
and the four pathologies are planted on purpose and named, so the corpus is auditable
in a way a scrape would not be.

---

## System / architecture

Four layers. The boundaries are load-bearing and the dependency arrows only point
downward. Smaller than tam-calculator's six because this problem has no uncertainty,
capacity, or naive-comparison layer — it doesn't need one.

```
data/            corpus generation + committed JSON + zod load schema
  ↓
lib/domain/      Contact, Account, SignalWeights, ConfidenceTiers, Config — types + zod
  ↓
lib/match/       normalization, similarity, blocking, pairwise scoring + receipts
  ↓
lib/graph/       union-find clustering, cluster ranking/tiering
  ↓
app/             console (RSC where possible) + /api/v1/dedupe
```

### Rules of the architecture

1. **`lib/match/` and `lib/graph/` are pure and deterministic.** Same corpus + same
   `Config` ⇒ byte-identical `DedupeResult`. No `Date.now()`, no `Math.random()`.
2. **Nothing below `app/` knows about React, HTTP, or the DOM.** `lib/match/` and
   `lib/graph/` must run identically in the browser (for live client-side recompute)
   and in the API route.
3. **Contact clustering and account clustering are fully independent.** Nothing in
   the contact pipeline may read an account record or vice versa — enforced by a
   sweep invariant (isolation, see *Validation*).
4. **Every measurement is computed once, in `lib/match/` or `lib/graph/`.** The
   console never recomputes a score or a cluster for display.

---

## Data model

### Contact

```ts
type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;        // raw, may contain +tags, casing variation
  phone: string;         // raw, may contain formatting
  company: string;       // free-text, messy, NOT a foreign key
  linkedinUrl?: string;
};
```

### Account

```ts
type Account = {
  id: string;
  name: string;
  domain: string;    // raw, may contain protocol/www
  phone: string;
  address: string;
};
```

### SignalWeights

```ts
type SignalWeights = {
  contact: {
    emailExact: number;     // default 50 — binary
    phoneExact: number;     // default 30 — binary
    linkedinExact: number;  // default 40 — binary
    nameMax: number;        // default 15 — pair signal, half A
    companyMax: number;     // default 15 — pair signal, half B
    nameFloor: number;      // default 0.82 — similarity floor for the pair
    companyFloor: number;   // default 0.70 — similarity floor for the pair
  };
  account: {
    domainExact: number;    // default 60 — binary
    phoneExact: number;     // default 25 — binary
    nameMax: number;        // default 25 — scaled by similarity
    nameFloor: number;      // default 0.80
    addressMax: number;     // default 20 — scaled by similarity
    addressFloor: number;   // default 0.75
  };
};
```

### ConfidenceTiers

```ts
type ConfidenceTiers = {
  contact: { high: number; possible: number };  // default { high: 50, possible: 25 }
  account: { high: number; possible: number };  // default { high: 55, possible: 20 }
};
```

zod-enforced: `possible <= high` for both entity types, every weight and floor >= 0,
floors <= 1. An inverted or negative config is a rejected request, not a silent
misbehavior.

### Config

```ts
type Config = {
  corpusId: string;
  weights: SignalWeights;
  tiers: ConfidenceTiers;
};
```

`Config` is the entire input. The permalink encodes `Config` and nothing else; the
result is always recomputed, never transported.

### MatchEdge / Cluster / DedupeResult

```ts
type MatchEdge = {
  sourceId: string;
  targetId: string;
  score: number;
  tier: 'high' | 'possible';
  signals: Array<{ signal: string; points: number; detail: string }>;  // the receipt
};

type Cluster = {
  id: string;
  recordIds: string[];
  edges: MatchEdge[];
  strongestTier: 'high' | 'possible';
  maxScore: number;
};

type DedupeResult = {
  config: Config;
  contactClusters: Cluster[];
  accountClusters: Cluster[];
};
```

Only clusters with 2+ records appear — a record with no edge above its entity type's
`possible` floor is not a cluster of one; it's simply absent from the output.

---

## Method

### Normalization

- **Email**: lowercase, trim; strip everything from `+` to `@` in the local part;
  remove `.` from the local part. Applied uniformly regardless of provider — a stated
  simplification (real dot-stripping is Gmail-specific; uniform application keeps the
  rule deterministic and auditable rather than provider-aware).
- **Phone**: strip all non-digit characters; compare the last 10 digits.
- **Name** (contact): lowercase, trim, collapse whitespace.
- **Company / Account name**: lowercase, trim, strip common legal suffixes (`inc`,
  `llc`, `ltd`, `corp`, `co`, `company`, with or without trailing `.`), collapse
  whitespace.
- **LinkedIn URL**: strip protocol, strip leading `www.`, strip trailing `/`,
  lowercase.
- **Domain**: strip protocol, strip leading `www.`, strip any path, lowercase.
- **Address**: lowercase, trim, canonicalize common street-suffix abbreviations
  (`street`↔`st`, `avenue`↔`ave`, `road`↔`rd`, `boulevard`↔`blvd`), collapse
  whitespace.

### Similarity

```
similarity(a, b) = 1 - levenshtein(a, b) / max(len(a), len(b), 1)
```

Using `fastest-levenshtein`'s `distance`. Range 0–1. Used for the fuzzy fields
(contact name, contact company, account name, account address) after normalization.

### Pairwise scoring

**Contact pair**, given normalized fields:

```
score = (emailNorm equal ? weights.emailExact : 0)
      + (phoneNorm equal  ? weights.phoneExact : 0)
      + (linkedinNorm equal ? weights.linkedinExact : 0)
      + pairScore
```

where `pairScore` is a single joint signal — it fires only when *both* floors are
crossed, never from name or company alone:

```
nameSim = similarity(nameA, nameB)
companySim = similarity(companyA, companyB)
pairScore = (nameSim >= weights.nameFloor && companySim >= weights.companyFloor)
  ? round(weights.nameMax * nameSim + weights.companyMax * companySim)
  : 0
```

**Account pair**, given normalized fields:

```
score = (domainNorm equal ? weights.domainExact : 0)
      + (phoneNorm equal  ? weights.phoneExact : 0)
      + (nameSim >= weights.nameFloor ? round(weights.nameMax * nameSim) : 0)
      + (addressSim >= weights.addressFloor ? round(weights.addressMax * addressSim) : 0)
```

Account name and address are independent signals (not a joint pair like contact
name+company) — a strong address match alone is real corroborating evidence for a
business, unlike a bare name match for a person.

An edge exists between two records only when `score >= tiers.<entity>.possible`;
below that, no edge. Its `tier` is `high` when `score >= tiers.<entity>.high`, else
`possible`.

### Blocking

Naive all-pairs is never run. Each record is placed into several cheap-key buckets;
only records sharing at least one bucket are scored against each other.

- **Contact** buckets: normalized email (exact), last 6 digits of normalized phone,
  first 3 letters of normalized last name + first letter of first name, normalized
  LinkedIn slug.
- **Account** buckets: normalized domain, last 6 digits of normalized phone, first 4
  characters of the normalized/suffix-stripped name.

Candidate pairs are the union of every pair sharing any one bucket, deduplicated,
then scored with the full formula above.

### Clustering

Build a graph per entity type: nodes are records, edges are the candidate pairs
scoring at or above the `possible` floor. Run union-find over those edges. Each
connected component with 2+ records is a `Cluster` — transitive by construction: if
A–B and B–C both clear the floor, A, B, and C cluster together even when A–C alone
would not.

---

## The corpus and the four named pathologies

~2,000 contacts and ~500 accounts, generated from a fixed seed by `data/generate.ts`,
committed as JSON. Four structures are planted on purpose in **both** entity types,
each demonstrating one thesis gap, each asserted by a test:

| name | planted structure | what it proves |
|---|---|---|
| `THE TWINS` | an exact-duplicate pair — same normalized email/domain, same phone, same LinkedIn/address | scores at the top of the ranking, both tiers agree it's `high` |
| `THE CHAIN` | a transitive triple A–B–C where A–B and B–C each clear the floor but A–C shares nothing | proves clustering is connected-components, not pairwise — A, B, C cluster together with no direct A–C edge |
| `THE IMPOSTER` | two genuinely distinct records with a deceptively similar name but disagreeing on every corroborating signal (company/domain, email, phone) | the joint-floor pair rule (contacts) / independent-signal scoring (accounts) refuses the match — score stays below `possible`, a precision trap correctly not sprung |
| `THE GHOST` | a sparse record whose only signal is a name/company (or name/address) pair sitting right at the floor | lands exactly at the `possible` boundary, proving the tier cutoff is a real, visible line, not a fudge |

Each pathology has a test in `data/contacts.test.ts` and `data/accounts.test.ts`
asserting the structure still exists, so a change to the generator that quietly
flattens a pathology fails the suite rather than silently weakening the demo.

---

## Console

Single page, four sections, all driven by the permalink-encoded `Config`. Opens on
the demo corpus with clusters already computed — no upload, no key, no empty state
required for the happy path.

1. **Cluster list** — contact/account toggle, clusters ranked by strongest edge tier
   then size.
2. **Graph view** — force-directed subgraph (`d3-force`) for the selected cluster,
   edges styled and labeled by tier.
3. **Record detail** — side-by-side field comparison for a selected edge, plus the
   full signal-by-signal scoring receipt.
4. **Controls** — every weight, floor, and tier cutoff, live client-side recompute.

Every control writes to the permalink.

---

## API surface

- `POST /api/v1/dedupe` — zod-validated `Config` in, full `DedupeResult` out. No
  auth, no persistence, no rate limit.
- `GET /api/schema` — the request/response schema, rendered from the zod schemas so
  it cannot drift from the implementation.

---

## Implementation task order

Each numbered item is one commit, pushed to `main` on completion.

1. `chore`: scaffold, configs, license, this plan.
2. `feat(domain)`: types, zod schemas (`Contact`, `Account`, `SignalWeights`,
   `ConfidenceTiers`, `Config`).
3. `feat(data)`: corpus generator, four pathologies planted in both entity types,
   committed JSON, structure tests.
4. `feat(match)`: normalization, similarity, blocking, pairwise scoring + receipts.
5. `feat(graph)`: union-find clustering, cluster ranking/tiering.
6. `test`: `scripts/sweep.mts` — the nine invariants over the cross-product.
7. `feat(api)`: `POST /api/v1/dedupe`, `GET /api/schema`, permalink codec.
8. `feat(app)`: the console — four sections.
9. `docs`: README, plain-English guide, screenshots from the live deployment.

Order is dependency-forced: nothing above can be built before everything below it
exists.

---

## Validation / test plan

**Unit tests** (`vitest`, `lib/**/*.test.ts`, `data/**/*.test.ts`): normalization
rules against hand-built cases; similarity formula boundary values; pairwise scoring
against hand-computed expected totals; union-find clustering correctness; the four
pathology structure assertions for both entity types; permalink codec round-trip;
zod boundary rejection (inverted tiers, negative weights).

**`npm run sweep`** — no network, asserting **nine invariants**:

1. **Determinism.** Same corpus + `Config` ⇒ byte-identical `DedupeResult`.
2. **Weight monotonicity.** Increasing any single signal weight (holding everything
   else fixed) never decreases a pair's score.
3. **Tier-threshold monotonicity.** Raising a `tiers.*.high` or `tiers.*.possible`
   cutoff never increases the count of edges classified at or above that tier.
4. **Floor monotonicity.** Raising a fuzzy floor (`nameFloor`, `companyFloor`,
   `addressFloor`) never increases total edge count.
5. **Symmetry.** `score(A, B) === score(B, A)` for every candidate pair.
6. **Cluster partition.** No record appears in two clusters within the same entity
   type; every cluster has 2+ distinct record ids.
7. **Entity-type isolation.** Changing any contact weight, floor, or tier never
   changes a single `accountClusters` value, and vice versa.
8. **Blocking completeness.** On a held-out stratified sample, candidate pairs found
   via blocking are a superset of the pairs found via brute-force all-pairs on that
   sample — blocking must never silently drop a true match.
9. **Pathology persistence.** At default `Config`, `THE TWINS`/`THE CHAIN`/
   `THE IMPOSTER`/`THE GHOST` each produce their documented outcome through the real
   match + cluster pipeline, for both entity types.

**Manual verification** before shipping: the main journey end to end on the deployed
URL, plus the failure states — a `Config` with all weights at zero (no clusters at
all) and a rejected inverted-tier request. Each must produce a named, readable
empty/refusal state, never a crash.

---

## Deployment plan

Vercel, linked at task 1 so the live URL exists before the README needs it. No
environment variables, no secrets, no external calls at runtime — the corpus is
committed, so the deployment is static plus pure compute. `main` is the production
branch; every task pushes.

---

## README plan

Following the house structure: title, one-sentence thesis, live link, plain-English
guide link, day marker, hero screenshot, then **Why I Built This** (the four gaps
above, argued), **What It Does**, **Demo** (walking the four named pathologies with
screenshots — `THE TWINS`, `THE CHAIN`, `THE IMPOSTER`, `THE GHOST`), **How It Works**
(the pipeline diagram, the scoring formula, blocking, clustering), **The numbers this
tool refuses to fake** (the false-positive trap), **Tradeoffs and what is arbitrary**
(the weight defaults, US-only normalization, no cross-entity linkage), **Run it
locally**, **Repo map**.

Plus `docs/plain-english-guide.md` for the non-engineer reader, matching the sibling
repos.

---

## Definition of done

- [ ] `npm run build`, `npm run typecheck`, `npm run lint` all clean.
- [ ] `npm test` green, including all pathology assertions for both entity types.
- [ ] `npm run sweep` green on all nine invariants.
- [ ] Console live on Vercel, opening on computed clusters with no interaction.
- [ ] All four console sections implemented, reading from one match+cluster pass.
- [ ] Every displayed edge shows its full signal-by-signal receipt.
- [ ] Blocking-completeness invariant passes against a brute-force sample.
- [ ] Permalink round-trips; clusters byte-identical.
- [ ] Zero-weight and inverted-tier configs produce a named refusal/empty state, never
      a crash.
- [ ] README with real screenshots from the live deployment; plain-English guide.
- [ ] Every task pushed to `main`.

---

## Cut order if the day runs out

Cut from the bottom. Each cut is a section removed cleanly, never a claim weakened.

1. `docs/plain-english-guide.md`.
2. Account-entity pathology test parity — keep account matching functioning, but
   drop the four named-pathology assertions for accounts (keep them for contacts).
3. Live weight/threshold controls in the console — keep every value adjustable via
   the API/permalink, drop the interactive sliders UI.
4. Force-directed graph polish — fall back to a static, styled list of edges per
   cluster instead of `d3-force` layout (the record detail receipt still carries the
   explanation without the picture).

**Never cut:** the per-edge explainability receipt, transitive (connected-components)
clustering, `THE IMPOSTER` precision-trap pathology in contacts, the
blocking-completeness sweep invariant, or the sweep itself.

---

## Post-MVP (not in this build)

- CSV export of clusters/edges.
- Upload your own CRM export (CSV with a declared field mapping).
- Cross-entity matching (using a contact/account relationship as a corroborating
  signal).
- Merge simulation — a read-only survivor-record preview, still no persistence.
- Non-US phone/address normalization.
- Weights fit from a labeled reference set instead of hand-set defaults (still
  deterministic, just calibrated) — a materially harder problem, scoped out.

---

## Settled decisions

Every one of these was put to the user and confirmed before code was written.

1. **Both entity types**, contacts and accounts, as two fully independent dedupe
   problems — no cross-entity matching.
2. Corpus is **synthetic, seeded, committed** — ~2,000 contacts, ~500 accounts.
3. Contact `company` is a **free-text string**, not a foreign key to the accounts
   table — the mess that makes dedupe a real problem.
4. Matching is a **deterministic weighted-signal framework** with fixed, documented
   formulas; fuzzy similarity uses a small edit-distance library
   (`fastest-levenshtein`), not a black-box ML matcher.
5. **Blocking**, not naive all-pairs, with a checked completeness invariant.
6. Clustering is **connected components (union-find) over a match graph**, transitive
   by construction, not pairwise.
7. **Two confidence tiers** (High / Possible) per edge, both weights and cutoffs
   user-adjustable.
8. Scope is **read-only**: detect, score, explain, visualize. No merge/write action.
9. Console is **one page, four sections**: cluster list, graph view, record detail,
   controls — opening on a computed result.
10. Graph rendering uses **`d3-force`**, the one deliberate exception to the
    "no library" convention across the series, because hand-rolling a force
    simulation is out of scope for a one-day build.
11. Public surface is **permalink + `POST /api/v1/dedupe` + `GET /api/schema`**. No
    CSV in this build (see *Post-MVP*), no auth, no persistence.
12. Stack is otherwise **identical to the sibling repos**; deployment is Vercel.
13. **Four named pathologies** — `THE TWINS`, `THE CHAIN`, `THE IMPOSTER`,
    `THE GHOST` — planted in both entity types, each asserted by a test.
14. **Nine sweep invariants**, listed above, run over a cross-product with no
    network, including a blocking-completeness check against brute-force.
15. Time limit is **one day**; the cut order above is fixed in advance.
16. Push to `main` after **every** completed task.
17. Repo is **public** on GitHub under `akshatiwarix`, matching the rest of the
    series.
