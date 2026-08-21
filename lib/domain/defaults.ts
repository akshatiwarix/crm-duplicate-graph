import type { Config } from "./config";

export const DEFAULT_CORPUS_ID = "demo-2000c-500a-v1";

export const DEFAULT_SIGNAL_WEIGHTS: Config["weights"] = {
  contact: {
    emailExact: 50,
    phoneExact: 30,
    linkedinExact: 40,
    nameMax: 15,
    companyMax: 15,
    nameFloor: 0.82,
    companyFloor: 0.7,
  },
  account: {
    domainExact: 60,
    phoneExact: 25,
    nameMax: 25,
    nameFloor: 0.8,
    addressMax: 20,
    addressFloor: 0.75,
  },
};

export const DEFAULT_CONFIDENCE_TIERS: Config["tiers"] = {
  contact: { high: 50, possible: 25 },
  account: { high: 55, possible: 20 },
};

export const DEFAULT_CONFIG: Config = {
  corpusId: DEFAULT_CORPUS_ID,
  weights: DEFAULT_SIGNAL_WEIGHTS,
  tiers: DEFAULT_CONFIDENCE_TIERS,
};
