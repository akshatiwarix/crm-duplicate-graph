import { describe, expect, it } from "vitest";
import { buildClusters } from "./cluster";
import type { MatchEdge, Tier } from "@/lib/domain/result";

function edge(sourceId: string, targetId: string, score: number, tier: Tier): MatchEdge {
  return { sourceId, targetId, score, tier, signals: [] };
}

describe("buildClusters", () => {
  it("clusters transitively: A-B and B-C join even with no A-C edge (THE CHAIN)", () => {
    const clusters = buildClusters([edge("A", "B", 30, "possible"), edge("B", "C", 50, "high")]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.recordIds).toEqual(["A", "B", "C"]);
  });

  it("keeps disjoint edges as separate clusters", () => {
    const clusters = buildClusters([edge("A", "B", 40, "possible"), edge("X", "Y", 40, "possible")]);
    expect(clusters).toHaveLength(2);
    const ids = clusters.map((c) => c.recordIds.slice().sort().join(","));
    expect(new Set(ids).size).toBe(2);
  });

  it("partitions records: no record in two clusters, every cluster has 2+ records", () => {
    const clusters = buildClusters([
      edge("A", "B", 30, "possible"),
      edge("B", "C", 50, "high"),
      edge("X", "Y", 150, "high"),
    ]);
    const seen = new Set<string>();
    for (const cluster of clusters) {
      expect(cluster.recordIds.length).toBeGreaterThanOrEqual(2);
      for (const id of cluster.recordIds) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
    }
  });

  it("sets strongestTier to high when any member edge is high", () => {
    const clusters = buildClusters([edge("A", "B", 30, "possible"), edge("B", "C", 50, "high")]);
    expect(clusters[0]?.strongestTier).toBe("high");
    expect(clusters[0]?.maxScore).toBe(50);
  });

  it("ranks a high-tier cluster before a possible-tier cluster", () => {
    const clusters = buildClusters([
      edge("A", "B", 30, "possible"),
      edge("X", "Y", 150, "high"),
    ]);
    expect(clusters[0]?.strongestTier).toBe("high");
    expect(clusters[1]?.strongestTier).toBe("possible");
  });

  it("ranks a larger cluster before a smaller one within the same tier", () => {
    const clusters = buildClusters([
      edge("A", "B", 150, "high"),
      edge("X", "Y", 150, "high"),
      edge("Y", "Z", 150, "high"),
    ]);
    expect(clusters[0]?.recordIds).toHaveLength(3);
    expect(clusters[1]?.recordIds).toHaveLength(2);
  });
});
