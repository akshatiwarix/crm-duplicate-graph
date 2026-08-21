import { z } from "zod";

const tierPairSchema = z
  .object({
    high: z.number().nonnegative(),
    possible: z.number().nonnegative(),
  })
  .refine((t) => t.possible <= t.high, {
    message: "possible tier must be <= high tier",
    path: ["possible"],
  });

export const confidenceTiersSchema = z.object({
  contact: tierPairSchema,
  account: tierPairSchema,
});

export type ConfidenceTiers = z.infer<typeof confidenceTiersSchema>;
