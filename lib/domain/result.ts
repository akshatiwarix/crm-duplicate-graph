import { z } from "zod";
import { configSchema } from "./config";

export const tierSchema = z.enum(["high", "possible"]);
export type Tier = z.infer<typeof tierSchema>;

export const matchSignalSchema = z.object({
  signal: z.string().min(1),
  points: z.number(),
  detail: z.string(),
});
export type MatchSignal = z.infer<typeof matchSignalSchema>;

export const matchEdgeSchema = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
  score: z.number(),
  tier: tierSchema,
  signals: z.array(matchSignalSchema),
});
export type MatchEdge = z.infer<typeof matchEdgeSchema>;

export const clusterSchema = z.object({
  id: z.string().min(1),
  recordIds: z.array(z.string().min(1)),
  edges: z.array(matchEdgeSchema),
  strongestTier: tierSchema,
  maxScore: z.number(),
});
export type Cluster = z.infer<typeof clusterSchema>;

export const dedupeResultSchema = z.object({
  config: configSchema,
  contactClusters: z.array(clusterSchema),
  accountClusters: z.array(clusterSchema),
});
export type DedupeResult = z.infer<typeof dedupeResultSchema>;
