# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Day 018 of a 100-day portfolio series. A visual system for CRM contact/account
dedupe — showing not just that two records are likely duplicates, but *why*,
and how records cluster transitively into one duplicate group instead of a
list of disconnected pairs. **`PLAN.md` is the contract for this repo** — it
was settled with the user before any code was written and is not a draft to
improve on. If code and `PLAN.md` disagree, the code is wrong; if `PLAN.md`
needs to change, it changes there first, in writing, with a reason. Read
`PLAN.md` in full before implementing anything — it contains the data model,
the exact normalization/similarity/scoring/blocking/clustering formulas, the
four planted corpus pathologies, the nine sweep invariants, and the numbered
implementation task order this repo is built in.

## Commands

- `npm run dev` — start the dev server.
- `npm run build` — production build.
- `npm run typecheck` — `next typegen && tsc --noEmit`.
- `npm run lint` — ESLint (flat config, `eslint-config-next`).
- `npm test` / `npm run test:watch` — vitest over `lib/**/*.test.ts` and
  `data/**/*.test.ts`.
- `npm run sweep` — `vite-node` script (`scripts/sweep.mts`) asserting the nine
  cross-product invariants listed in `PLAN.md` (§ Validation / test plan). No network.
- `npm run corpus` — regenerates the committed synthetic corpus from `data/generate.ts`
  (fixed seed; only needed if the generator changes, since the JSON is committed).
- Run a single test file: `npx vitest run lib/match/scoring.test.ts`.

## Architecture

Four downward-only dependency layers. Nothing below `app/` may import React, HTTP, or
DOM APIs.

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

Load-bearing rules (each enforced by a `npm run sweep` invariant — see `PLAN.md`):

- `lib/match/` and `lib/graph/` are pure and deterministic: same corpus + same
  `Config` ⇒ byte-identical `DedupeResult`. No `Date.now()`, no `Math.random()`.
- `lib/match/` and `lib/graph/` must run identically in the browser (for live
  client-side recompute in the Controls panel) and in the API route — no
  Node-only or DOM-only APIs inside them.
- **Contact clustering and account clustering are fully independent.** Nothing
  in the contact pipeline may read an account record or vice versa. Contacts
  and accounts are two separate dedupe problems, run and displayed separately
  — a contact's `company` field is a free-text string, not a foreign key, and
  there is no cross-entity matching in this build.
- `Config` (see `PLAN.md` § Data model) is the entire input surface and the
  entire permalink payload. The permalink encodes `Config` only; `DedupeResult`
  is always recomputed from it, never transported.
- Every measurement is computed once, in `lib/match/` or `lib/graph/`. The
  console must never recompute a score or a cluster for display.

## Stack

Next.js (App Router) + React + TypeScript strict with `noUncheckedIndexedAccess`,
Tailwind CSS 4, zod at every boundary (API input, corpus load, permalink decode),
vitest + vite-node for tests/scripts, deployed on Vercel. `d3-force` (simulation
only) for the graph layout — the one deliberate library exception in the series,
because hand-rolling a force simulation is out of scope for a one-day build; nodes
and edges are still rendered as plain SVG/React. `fastest-levenshtein` for the
edit-distance primitive underneath the similarity formula — not a black-box
matcher, just the distance function the documented formula is built on.

## Corpus

`data/generate.ts` produces the committed corpus (~2,000 contacts, ~500 accounts)
from a fixed seed. Four structures are planted on purpose, in **both** entity
types, each asserted by a test in `data/contacts.test.ts` / `data/accounts.test.ts`:
`THE TWINS` (an exact-duplicate pair, both tiers agree `high`), `THE CHAIN` (a
transitive triple A–B–C where A–B and B–C clear the floor but A–C shares nothing —
proves clustering is connected-components, not pairwise), `THE IMPOSTER` (two
distinct records with a deceptively similar name but disagreeing corroborating
signals — the precision trap the matcher must correctly refuse), `THE GHOST` (a
sparse record sitting exactly at the `possible` tier boundary). If you touch the
generator, run `data/*.test.ts` to confirm no pathology was accidentally flattened.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
