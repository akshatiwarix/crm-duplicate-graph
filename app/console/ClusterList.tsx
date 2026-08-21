"use client";

import type { Cluster } from "@/lib/domain/result";
import { TierPill } from "./TierPill";

type Props = {
  clusters: Cluster[];
  displayName: (id: string) => string;
  selectedClusterId: string | undefined;
  onSelect: (id: string) => void;
};

export function ClusterList({ clusters, displayName, selectedClusterId, onSelect }: Props) {
  if (clusters.length === 0) {
    return (
      <p className="text-sm text-ink-dim">
        No clusters at the current weights and tiers — every candidate pair scored below the possible floor.
      </p>
    );
  }

  return (
    <ol className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
      {clusters.map((cluster, i) => {
        const selected = cluster.id === selectedClusterId;
        return (
          <li key={cluster.id}>
            <button
              type="button"
              onClick={() => onSelect(cluster.id)}
              className={`w-full rounded-md border px-3 py-2.5 text-left transition-colors ${
                selected ? "border-line-strong bg-paper-raised" : "border-line hover:border-line-strong"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-ink-dim">#{i + 1}</span>
                <TierPill tier={cluster.strongestTier} />
              </div>
              <p className="mt-1.5 truncate text-sm text-ink">
                {cluster.recordIds.map(displayName).join("  ·  ")}
              </p>
              <p className="mt-1 font-mono text-xs tabular text-ink-dim">
                {cluster.recordIds.length} records · max score {cluster.maxScore}
              </p>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
