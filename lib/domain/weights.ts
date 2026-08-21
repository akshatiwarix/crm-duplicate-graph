import { z } from "zod";

const nonNegative = z.number().nonnegative();
const floor01 = z.number().min(0).max(1);

export const contactSignalWeightsSchema = z.object({
  emailExact: nonNegative,
  phoneExact: nonNegative,
  linkedinExact: nonNegative,
  nameMax: nonNegative,
  companyMax: nonNegative,
  nameFloor: floor01,
  companyFloor: floor01,
});

export type ContactSignalWeights = z.infer<typeof contactSignalWeightsSchema>;

export const accountSignalWeightsSchema = z.object({
  domainExact: nonNegative,
  phoneExact: nonNegative,
  nameMax: nonNegative,
  nameFloor: floor01,
  addressMax: nonNegative,
  addressFloor: floor01,
});

export type AccountSignalWeights = z.infer<typeof accountSignalWeightsSchema>;

export const signalWeightsSchema = z.object({
  contact: contactSignalWeightsSchema,
  account: accountSignalWeightsSchema,
});

export type SignalWeights = z.infer<typeof signalWeightsSchema>;
