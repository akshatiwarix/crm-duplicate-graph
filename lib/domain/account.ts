import { z } from "zod";

export const accountSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  domain: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().min(1),
});

export type Account = z.infer<typeof accountSchema>;

export const accountCorpusSchema = z.array(accountSchema);
export type AccountCorpus = z.infer<typeof accountCorpusSchema>;
