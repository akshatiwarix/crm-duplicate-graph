import type { Contact } from "@/lib/domain/contact";
import type { Account } from "@/lib/domain/account";
import type { ContactSignalWeights, AccountSignalWeights } from "@/lib/domain/weights";
import type { MatchEdge } from "@/lib/domain/result";
import { contactBlockKeys, accountBlockKeys, candidatePairs } from "./blocking";
import { buildContactEdge, buildAccountEdge } from "./scoring";

function byId<T extends { id: string }>(records: readonly T[]): Map<string, T> {
  return new Map(records.map((r) => [r.id, r]));
}

/** Blocked candidate generation + full pairwise scoring, for every contact pair sharing a blocking key. */
export function matchContacts(
  contacts: readonly Contact[],
  weights: ContactSignalWeights,
  tiers: { high: number; possible: number },
): MatchEdge[] {
  const index = byId(contacts);
  const edges: MatchEdge[] = [];
  for (const [idA, idB] of candidatePairs(contacts, contactBlockKeys)) {
    const a = index.get(idA);
    const b = index.get(idB);
    if (!a || !b) continue;
    const edge = buildContactEdge(a, b, weights, tiers);
    if (edge) edges.push(edge);
  }
  return edges;
}

/** Blocked candidate generation + full pairwise scoring, for every account pair sharing a blocking key. */
export function matchAccounts(
  accounts: readonly Account[],
  weights: AccountSignalWeights,
  tiers: { high: number; possible: number },
): MatchEdge[] {
  const index = byId(accounts);
  const edges: MatchEdge[] = [];
  for (const [idA, idB] of candidatePairs(accounts, accountBlockKeys)) {
    const a = index.get(idA);
    const b = index.get(idB);
    if (!a || !b) continue;
    const edge = buildAccountEdge(a, b, weights, tiers);
    if (edge) edges.push(edge);
  }
  return edges;
}
