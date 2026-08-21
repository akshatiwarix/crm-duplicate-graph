import { z } from "zod";

export const contactSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().min(1),
  phone: z.string().min(1),
  company: z.string().min(1),
  linkedinUrl: z.string().min(1).optional(),
});

export type Contact = z.infer<typeof contactSchema>;

export const contactCorpusSchema = z.array(contactSchema);
export type ContactCorpus = z.infer<typeof contactCorpusSchema>;
