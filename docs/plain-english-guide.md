# CRM Duplicate Graph — how it works, in plain English

No code in this one. If you've ever run a "dedupe" pass on a CRM and had to just trust the tool's word for it, this is written for you.

## The problem, in one paragraph

A dedupe tool looks at two contact records and says "these are probably the same person" — or worse, just merges them for you. You have no idea *why* it thinks that, whether the "cluster" it found is one real duplicate chain or three unrelated coincidences stapled together, or whether it would confidently merge two people who just happen to have similar names. This tool exists to show its work on all three, instead of asking you to trust a score.

## 1. A score with no reason attached isn't a reason to trust it

"87% match" tells you nothing about *why*. Was it the email? The phone? A fuzzy guess on the name? Without knowing which, you can't tell a solid match from a coincidence, so most people end up either rubber-stamping every suggestion or ignoring all of them.

This tool never shows a score without the receipt underneath it: every signal that fired, in plain terms ("email exact match", "name 93% similar, floor was 82%"), and exactly how many points each one contributed. Two records that score 150 because their email, phone, LinkedIn, *and* name all matched look completely different from two records that scraped by on one weak signal — and now you can tell which is which at a glance.

## 2. Duplicates aren't pairs — they're chains, and most tools only see pairs

Say contact A and contact B share a phone number, and separately, B and contact C share an email address. A and C, on paper, have nothing in common. A tool that only compares pairs reports two disconnected "maybe" flags and leaves it to a human to notice they're actually the same mess.

This tool builds a graph instead: every record is a node, every likely match is an edge, and it looks for connected clusters, not isolated pairs. A, B, and C end up in the same cluster because A connects to C *through* B — even though a direct A-to-C comparison would never have flagged anything. That's the difference between a list of coincidences and an actual picture of the mess.

## 3. Fuzzy matching that's too eager will merge two different people

Aggressive fuzzy name matching is a trap: "Jonathan Reyes" and "Jonathon Reyes" are one letter apart and look like an obvious typo-duplicate. But what if they're two completely different people who happen to have similar names — different companies, different phone numbers, different emails?

This tool requires *two* signals to agree before a fuzzy name match counts for anything: the name has to be similar **and** the company has to be similar. A deceptively similar name with a completely different company scores **zero** — not "low", zero, no edge at all — because one strong-looking signal with no corroboration is exactly the kind of thing that should not trigger a merge. The tool would rather miss a borderline case than wrongly combine two people's records, because a bad merge destroys data a bad "maybe" doesn't.

## 4. Checking every record against every other record doesn't scale, and skipping that check is a silent risk

A real CRM might have hundreds of thousands of records. Comparing every single one to every other one is computationally enormous, so every real dedupe tool uses a shortcut — group records into cheap buckets first (same normalized email, same area code, same first few letters of a last name), and only compare records that land in the same bucket. That's called blocking, and it's completely standard. The part almost nobody checks is: does the shortcut ever accidentally skip a real duplicate?

This tool checks. It takes a sample of records, finds every true match the slow, exhaustive way, and confirms the fast bucket-based shortcut found every single one of those matches too — a repeatable, automated check that runs in under half a second and would fail loudly if the shortcut ever quietly dropped something it shouldn't have.

## What this tool doesn't try to do

It doesn't merge anything. This is a detect-and-explain tool, not a write tool — there's no "confirm merge" button anywhere, on purpose. Deciding what to do about a duplicate is a judgment call for a human with context this tool doesn't have; showing the evidence clearly enough that the judgment call is easy is the whole job.

It also doesn't try to match a contact to "its" company record. A contact's employer, as typed into a CRM, is messy free text — "Acme", "ACME Inc.", "acme corp" — not a reliable link to a specific account. Building that link well is a genuinely different, harder problem, so contacts and companies are deduplicated as two separate questions here, each with its own honest answer, rather than one blurred-together guess.
