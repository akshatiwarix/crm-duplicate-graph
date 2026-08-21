import { z } from "zod";
import { signalWeightsSchema } from "./weights";
import { confidenceTiersSchema } from "./tiers";

export const configSchema = z.object({
  corpusId: z.string().min(1),
  weights: signalWeightsSchema,
  tiers: confidenceTiersSchema,
});

export type Config = z.infer<typeof configSchema>;
