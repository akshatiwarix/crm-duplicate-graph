import type { Tier } from "@/lib/domain/result";

export function TierPill({ tier }: { tier: Tier }) {
  const isHigh = tier === "high";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
        isHigh ? "bg-high-dim text-high" : "bg-possible-dim text-possible"
      }`}
    >
      {tier}
    </span>
  );
}
