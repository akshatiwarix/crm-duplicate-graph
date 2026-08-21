"use client";

import { useMemo } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
} from "d3-force";
import type { Cluster, MatchEdge } from "@/lib/domain/result";

type SimNode = SimulationNodeDatum & { id: string };

const WIDTH = 640;
const HEIGHT = 380;
const MARGIN = 34;

function layoutCluster(cluster: Cluster): Map<string, { x: number; y: number }> {
  const nodes: SimNode[] = cluster.recordIds.map((id) => ({ id }));
  const links = cluster.edges.map((e) => ({ source: e.sourceId, target: e.targetId }));

  const simulation = forceSimulation(nodes)
    .force(
      "link",
      forceLink<SimNode, (typeof links)[number]>(links)
        .id((d) => d.id)
        .distance(150)
        .strength(0.5),
    )
    .force("charge", forceManyBody().strength(-320))
    .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))
    .force("collide", forceCollide(40))
    .stop();

  for (let i = 0; i < 300; i++) simulation.tick();

  const positions = new Map<string, { x: number; y: number }>();
  for (const node of nodes) {
    positions.set(node.id, {
      x: Math.max(MARGIN, Math.min(WIDTH - MARGIN, node.x ?? WIDTH / 2)),
      y: Math.max(MARGIN, Math.min(HEIGHT - MARGIN, node.y ?? HEIGHT / 2)),
    });
  }
  return positions;
}

function edgeKey(edge: MatchEdge): string {
  return `${edge.sourceId}|${edge.targetId}`;
}

type Props = {
  cluster: Cluster;
  displayName: (id: string) => string;
  selectedEdgeKey: string | null;
  onSelectEdge: (edge: MatchEdge) => void;
};

export function GraphView({ cluster, displayName, selectedEdgeKey, onSelectEdge }: Props) {
  // Keyed on membership (not the cluster object, which is a fresh reference
  // on every recompute) so a config tweak that changes scores but not which
  // records are in the cluster doesn't re-run the simulation and jitter the
  // layout while the user is mid-drag on a slider.
  const membershipKey = cluster.recordIds.join(",");
  const positions = useMemo(() => layoutCluster(cluster), [membershipKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Force-directed graph of cluster ${cluster.id}`}
      className="h-auto w-full rounded-md border border-line bg-paper-raised"
    >
      {cluster.edges.map((edge) => {
        const from = positions.get(edge.sourceId);
        const to = positions.get(edge.targetId);
        if (!from || !to) return null;
        const key = edgeKey(edge);
        const selected = key === selectedEdgeKey;
        const color = edge.tier === "high" ? "var(--high)" : "var(--possible)";
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy) || 1;
        // Offset the score label perpendicular to the edge, not just at the
        // raw midpoint — two close nodes otherwise put the label right on
        // top of a node's name (always drawn below the node). Pick whichever
        // perpendicular direction pushes the label *upward*, away from that
        // below-node label zone, rather than a fixed rotation that can push
        // it the wrong way depending on the edge's angle.
        const offset = 16;
        const perpX = (-dy / len) * offset;
        const perpY = (dx / len) * offset;
        const sign = perpY <= 0 ? 1 : -1;
        const midX = (from.x + to.x) / 2 + perpX * sign;
        const midY = (from.y + to.y) / 2 + perpY * sign;
        return (
          <g key={key} className="cursor-pointer" onClick={() => onSelectEdge(edge)}>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={color}
              strokeWidth={selected ? 3 : 1.5}
              opacity={selected ? 1 : 0.55}
            />
            <rect x={midX - 13} y={midY - 8} width={26} height={16} fill="var(--paper-raised)" />
            <text
              x={midX}
              y={midY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="pointer-events-none select-none font-mono text-[9px] tabular"
              fill={color}
            >
              {edge.score}
            </text>
          </g>
        );
      })}
      {cluster.recordIds.map((id) => {
        const pos = positions.get(id);
        if (!pos) return null;
        return (
          <g key={id}>
            <circle cx={pos.x} cy={pos.y} r={15} className="fill-paper" stroke="var(--line-strong)" strokeWidth={1.5} />
            <text
              x={pos.x}
              y={pos.y + 28}
              textAnchor="middle"
              className="select-none fill-current font-mono text-[10px] text-ink"
            >
              {displayName(id).length > 16 ? `${displayName(id).slice(0, 15)}…` : displayName(id)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
