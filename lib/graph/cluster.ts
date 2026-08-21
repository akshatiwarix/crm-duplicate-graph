import type { MatchEdge, Cluster, Tier } from "@/lib/domain/result";
import { UnionFind } from "./union-find";

function compareEdges(a: MatchEdge, b: MatchEdge): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.sourceId !== b.sourceId) return a.sourceId < b.sourceId ? -1 : 1;
  if (a.targetId !== b.targetId) return a.targetId < b.targetId ? -1 : 1;
  return 0;
}

function tierRank(tier: Tier): number {
  return tier === "high" ? 0 : 1;
}

function rankClusters(clusters: Cluster[]): Cluster[] {
  return [...clusters].sort((a, b) => {
    const tierDiff = tierRank(a.strongestTier) - tierRank(b.strongestTier);
    if (tierDiff !== 0) return tierDiff;
    if (b.recordIds.length !== a.recordIds.length) return b.recordIds.length - a.recordIds.length;
    if (b.maxScore !== a.maxScore) return b.maxScore - a.maxScore;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * Union-find connected components over the match graph (PLAN.md § Method,
 * Clustering): nodes are records, edges are candidate pairs at or above the
 * `possible` floor. Transitive by construction — if A-B and B-C both clear
 * the floor, A, B, and C cluster together even when A-C alone would not
 * (THE CHAIN). Only components with 2+ records become a `Cluster`; a record
 * with no edge is simply absent from the output.
 *
 * Returned already ranked (strongest tier, then size — PLAN.md § Console)
 * so the console never has to recompute the ordering for display.
 */
export function buildClusters(edges: readonly MatchEdge[]): Cluster[] {
  const uf = new UnionFind();
  for (const edge of edges) {
    uf.union(edge.sourceId, edge.targetId);
  }

  const componentEdges = new Map<string, MatchEdge[]>();
  for (const edge of edges) {
    const root = uf.find(edge.sourceId);
    const list = componentEdges.get(root);
    if (list) list.push(edge);
    else componentEdges.set(root, [edge]);
  }

  const clusters: Cluster[] = [];
  for (const memberEdges of componentEdges.values()) {
    const idSet = new Set<string>();
    for (const edge of memberEdges) {
      idSet.add(edge.sourceId);
      idSet.add(edge.targetId);
    }
    const recordIds = [...idSet].sort();
    const first = recordIds[0];
    if (recordIds.length < 2 || !first) continue;

    const sortedEdges = [...memberEdges].sort(compareEdges);
    const strongestTier: Tier = sortedEdges.some((e) => e.tier === "high") ? "high" : "possible";
    const maxScore = sortedEdges.reduce((max, e) => Math.max(max, e.score), 0);

    clusters.push({
      id: `cluster-${first}`,
      recordIds,
      edges: sortedEdges,
      strongestTier,
      maxScore,
    });
  }

  return rankClusters(clusters);
}
