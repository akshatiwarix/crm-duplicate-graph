/**
 * Corpus generation.
 *
 * Two independent synthetic universes — contacts and accounts — generated
 * from a fixed seed, argued in PLAN.md: every claim this tool makes is about
 * *structure* (explainable scoring, transitive clustering, a real precision
 * floor, blocking correctness), and structure is a property of the shape of
 * a match graph, not of whose name is on the record.
 *
 * The four pathologies (THE TWINS, THE CHAIN, THE IMPOSTER, THE GHOST) are
 * planted in explicit, named passes in **both** entity types, each anchored
 * to the default `Config` in `lib/domain/defaults.ts` so the demo lands on
 * every pathology with zero interaction. Each pass is self-checked at
 * generation time against `data/pathology-formulas.ts` (see that file's
 * header for why the formulas are duplicated there rather than imported from
 * `lib/match`), and re-asserted in `data/contacts.test.ts` /
 * `data/accounts.test.ts`.
 */
import { contactCorpusSchema, type Contact } from "@/lib/domain/contact";
import { accountCorpusSchema, type Account } from "@/lib/domain/account";
import { DEFAULT_SIGNAL_WEIGHTS } from "@/lib/domain/defaults";
import { Rng, derive } from "@/lib/rng";
import { scoreContactPair, scoreAccountPair } from "./pathology-formulas";

export const CORPUS_GENERATION_SEED = 20260821;

export const TOTAL_CONTACTS = 2000;
export const TOTAL_ACCOUNTS = 500;

/* ------------------------------------------------------------------ *
 * Flavor pools. Never read as a matching signal by the pathology passes
 * below — those use their own dedicated, reserved strings.
 * ------------------------------------------------------------------ */

const FIRST_NAMES = [
  "Alex", "Bianca", "Caleb", "Delia", "Ezra", "Fiona", "Gideon", "Hana",
  "Idris", "Jael", "Kian", "Lior", "Maren", "Noor", "Otis", "Priya",
  "Quinn", "Rosa", "Silas", "Talia", "Uma", "Victor", "Wren", "Xander",
  "Yara", "Zane", "Amara", "Bruno", "Corin", "Dara", "Elio", "Freya",
  "Gareth", "Hollis", "Ines", "Jasper", "Kendra", "Leandro", "Mira", "Niall",
];

const LAST_NAMES = [
  "Okafor", "Whitfield", "Bianchi", "Castellan", "Dumont", "Ellsworth",
  "Farrow", "Grissom", "Halvorsen", "Isaacs", "Jarrah", "Kowalczyk",
  "Larsen", "Marchetti", "Nakamura", "Osei", "Pemberton", "Quintero",
  "Reyes", "Sorensen", "Tavares", "Underhill", "Vasquez", "Wexler",
  "Yamada", "Zielinski", "Abernathy", "Blackwood", "Corrigan", "Delacroix",
];

const COMPANY_PREFIXES = [
  "Solstice", "Marrow", "Gantry", "Petrel", "Coalfield", "Driftline",
  "Amberlight", "Fernbridge", "Halcyon", "Ironvale", "Juniper", "Kettleford",
  "Larkspur", "Mossgate", "Nightshade", "Oakhollow", "Pinegrove", "Quillfeather",
  "Ridgeback", "Saltmarsh", "Thistledown", "Underglen", "Vaultbridge", "Wrenfield",
  "Yellowbrook", "Zephyrline", "Ashgrove", "Briarcliff", "Clearwater", "Dovetail",
];

const COMPANY_SUFFIXES = [
  "Robotics", "Analytics", "Freight", "Media", "Legal", "Financial",
  "Biotech", "Logistics", "Consulting", "Software", "Manufacturing", "Capital",
  "Insurance", "Realty", "Foods", "Apparel",
];

const LEGAL_SUFFIXES = ["Inc", "Inc.", "LLC", "Ltd", "Ltd.", "Corp", "Corp.", "Co", "Co.", ""];

const STREET_NAMES = [
  "Maple", "Cedar", "Birch", "Elm", "Harbor", "Highland", "Meadow", "Orchard",
  "Ridge", "Sycamore", "Union", "Vine", "Willow", "Chestnut", "Franklin", "Garden",
];

const STREET_SUFFIXES = ["Street", "St", "Avenue", "Ave", "Road", "Rd", "Boulevard", "Blvd"];

const CITIES = [
  "Rivermont", "Ashford", "Brookhaven", "Cedar Falls", "Dunmore", "Elkridge",
  "Fairhaven", "Glendell", "Harborview", "Ivywood", "Jasper Creek", "Kingswell",
];

const STATES = ["CA", "NY", "TX", "IL", "WA", "CO", "MA", "GA", "OR", "NC"];

const EMAIL_DOMAINS = [
  "gmail.com", "outlook.com", "yahoo.com", "protonmail.com", "fastmail.com",
];

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function digits(rng: Rng, count: number): string {
  let s = "";
  for (let i = 0; i < count; i++) s += rng.int(10).toString();
  return s;
}

function randomPhoneDigits(rng: Rng): string {
  // Area code can't start with 0/1; keep it looking like a real US number.
  return `${2 + rng.int(8)}${digits(rng, 2)}${digits(rng, 7)}`;
}

function formatPhone(rng: Rng, tenDigits: string): string {
  const area = tenDigits.slice(0, 3);
  const exch = tenDigits.slice(3, 6);
  const line = tenDigits.slice(6, 10);
  const format = rng.int(5);
  switch (format) {
    case 0: return `(${area}) ${exch}-${line}`;
    case 1: return `${area}-${exch}-${line}`;
    case 2: return `${area}.${exch}.${line}`;
    case 3: return `+1 ${area} ${exch} ${line}`;
    default: return tenDigits;
  }
}

function companyName(rng: Rng): string {
  return `${rng.pick(COMPANY_PREFIXES)} ${rng.pick(COMPANY_SUFFIXES)}`;
}

function accountRawName(rng: Rng, base: string): string {
  const suffix = rng.pick(LEGAL_SUFFIXES);
  return suffix ? `${base} ${suffix}` : base;
}

function randomAddress(rng: Rng): string {
  const number = 1 + rng.int(9899);
  const street = rng.pick(STREET_NAMES);
  const suffix = rng.pick(STREET_SUFFIXES);
  const city = rng.pick(CITIES);
  const state = rng.pick(STATES);
  const zip = 10000 + rng.int(89999);
  return `${number} ${street} ${suffix}, ${city}, ${state} ${zip}`;
}

/* ------------------------------------------------------------------ *
 * Base contact generation.
 * ------------------------------------------------------------------ */

function generateBaseContacts(rng: Rng, count: number, startIndex: number): Contact[] {
  const contacts: Contact[] = [];
  for (let i = 0; i < count; i++) {
    const firstName = rng.pick(FIRST_NAMES);
    const lastName = rng.pick(LAST_NAMES);
    const domain = rng.pick(EMAIL_DOMAINS);
    const localStyle = rng.int(3);
    const local =
      localStyle === 0
        ? `${firstName}.${lastName}`
        : localStyle === 1
          ? `${firstName[0]}${lastName}`
          : `${firstName}${lastName}`;
    const email = rng.next() < 0.5 ? `${local}@${domain}`.toLowerCase() : `${local}@${domain}`;
    const phone = formatPhone(rng, randomPhoneDigits(rng));
    const company = accountRawName(rng, companyName(rng));
    const hasLinkedin = rng.next() < 0.4;
    const linkedinUrl = hasLinkedin
      ? `${rng.next() < 0.5 ? "https://www.linkedin.com/in/" : "linkedin.com/in/"}${slug(firstName)}${slug(lastName)}${rng.int(90) + 10}`
      : undefined;

    contacts.push({
      id: `contact-${String(startIndex + i + 1).padStart(4, "0")}`,
      firstName,
      lastName,
      email,
      phone,
      company,
      linkedinUrl,
    });
  }
  return contacts;
}

/* ------------------------------------------------------------------ *
 * Base account generation.
 * ------------------------------------------------------------------ */

function generateBaseAccounts(rng: Rng, count: number, startIndex: number): Account[] {
  const accounts: Account[] = [];
  for (let i = 0; i < count; i++) {
    const base = companyName(rng);
    const name = accountRawName(rng, base);
    const domain = `${rng.next() < 0.5 ? "www." : ""}${slug(base)}.com`;
    const phone = formatPhone(rng, randomPhoneDigits(rng));
    const address = randomAddress(rng);

    accounts.push({
      id: `account-${String(startIndex + i + 1).padStart(3, "0")}`,
      name,
      domain,
      phone,
      address,
    });
  }
  return accounts;
}

/* ------------------------------------------------------------------ *
 * Pathology IDs, exported so the test files can address specific records
 * without re-deriving the generation logic.
 * ------------------------------------------------------------------ */

export const CONTACT_TWINS_IDS = ["contact-twins-a", "contact-twins-b"] as const;
export const CONTACT_CHAIN_IDS = ["contact-chain-a", "contact-chain-b", "contact-chain-c"] as const;
export const CONTACT_IMPOSTER_IDS = ["contact-imposter-a", "contact-imposter-b"] as const;
export const CONTACT_GHOST_IDS = ["contact-ghost-a", "contact-ghost-b"] as const;

export const ACCOUNT_TWINS_IDS = ["account-twins-a", "account-twins-b"] as const;
export const ACCOUNT_CHAIN_IDS = ["account-chain-a", "account-chain-b", "account-chain-c"] as const;
export const ACCOUNT_IMPOSTER_IDS = ["account-imposter-a", "account-imposter-b"] as const;
export const ACCOUNT_GHOST_IDS = ["account-ghost-a", "account-ghost-b"] as const;

/* ------------------------------------------------------------------ *
 * THE TWINS.
 * ------------------------------------------------------------------ */

function buildContactTwins(): Contact[] {
  const [idA, idB] = CONTACT_TWINS_IDS;
  const first = "Marisol";
  const last = "Ferreira";
  const company = "Kestrel Ironworks Inc";
  const phoneDigits = "4155550142";
  const linkedin = "linkedin.com/in/marisolferreira77";
  return [
    {
      id: idA,
      firstName: first,
      lastName: last,
      email: "marisol.ferreira@fastmail.com",
      phone: "(415) 555-0142",
      company,
      linkedinUrl: `https://www.${linkedin}`,
    },
    {
      id: idB,
      firstName: first,
      lastName: last,
      email: "Marisol.Ferreira+work@fastmail.com",
      phone: `+1 ${phoneDigits.slice(0, 3)} ${phoneDigits.slice(3, 6)} ${phoneDigits.slice(6)}`,
      company: "kestrel ironworks inc.",
      linkedinUrl: linkedin,
    },
  ];
}

function buildAccountTwins(): Account[] {
  const [idA, idB] = ACCOUNT_TWINS_IDS;
  const domain = "brightlinelogix.com";
  const phoneDigits = "6465550198";
  const address = "480 Harbor Blvd, Ivywood, NY 10452";
  return [
    {
      id: idA,
      name: "Brightline Logix LLC",
      domain: `https://www.${domain}`,
      phone: "(646) 555-0198",
      address,
    },
    {
      id: idB,
      name: "brightline logix, llc.",
      domain,
      phone: `${phoneDigits.slice(0, 3)}.${phoneDigits.slice(3, 6)}.${phoneDigits.slice(6)}`,
      address: "480 Harbor Boulevard, Ivywood, NY 10452",
    },
  ];
}

/* ------------------------------------------------------------------ *
 * THE CHAIN. A–B share a phone, B–C share an email/domain, A–C shares
 * nothing — names/companies are chosen to be nowhere near either fuzzy
 * floor, so the only edges are the two deliberately planted ones.
 * ------------------------------------------------------------------ */

function buildContactChain(): Contact[] {
  const [idA, idB, idC] = CONTACT_CHAIN_IDS;
  const sharedPhoneDigits = "2135550177";
  const sharedEmail = "owen.castellan@outlook.com";
  return [
    {
      id: idA,
      firstName: "Priya",
      lastName: "Nakamura",
      email: "priya.nakamura@gmail.com",
      phone: `(${sharedPhoneDigits.slice(0, 3)}) ${sharedPhoneDigits.slice(3, 6)}-${sharedPhoneDigits.slice(6)}`,
      company: "Fernbridge Robotics",
    },
    {
      id: idB,
      firstName: "Owen",
      lastName: "Castellan",
      email: sharedEmail,
      phone: `${sharedPhoneDigits.slice(0, 3)}-${sharedPhoneDigits.slice(3, 6)}-${sharedPhoneDigits.slice(6)}`,
      company: "Halcyon Freight",
    },
    {
      id: idC,
      firstName: "Sana",
      lastName: "Okonkwo",
      email: "Owen.Castellan+newsletter@outlook.com",
      phone: "(917) 555-0163",
      company: "Saltmarsh Biotech",
    },
  ];
}

function buildAccountChain(): Account[] {
  const [idA, idB, idC] = ACCOUNT_CHAIN_IDS;
  const sharedPhoneDigits = "3125550188";
  const sharedDomain = "gantrymfg.com";
  return [
    {
      id: idA,
      name: "Coalfield Manufacturing",
      domain: "coalfieldmfg.com",
      phone: `(${sharedPhoneDigits.slice(0, 3)}) ${sharedPhoneDigits.slice(3, 6)}-${sharedPhoneDigits.slice(6)}`,
      address: "12 Cedar Rd, Dunmore, TX 73301",
    },
    {
      id: idB,
      name: "Gantry Manufacturing",
      domain: sharedDomain,
      phone: `${sharedPhoneDigits.slice(0, 3)}.${sharedPhoneDigits.slice(3, 6)}.${sharedPhoneDigits.slice(6)}`,
      address: "88 Willow Ave, Kingswell, CO 80014",
    },
    {
      id: idC,
      name: "Vaultbridge Insurance",
      domain: `www.${sharedDomain}`,
      phone: "(704) 555-0129",
      address: "215 Franklin St, Elkridge, MA 02110",
    },
  ];
}

/* ------------------------------------------------------------------ *
 * THE IMPOSTER. A deceptively similar name, every corroborating signal
 * disagreeing — the score must land at 0 (no edge at all).
 * ------------------------------------------------------------------ */

function buildContactImposter(): Contact[] {
  const [idA, idB] = CONTACT_IMPOSTER_IDS;
  return [
    {
      id: idA,
      firstName: "Jonathan",
      lastName: "Reyes",
      email: "jonathan.reyes@yahoo.com",
      phone: "(602) 555-0114",
      company: "Anchorpoint Legal",
    },
    {
      id: idB,
      firstName: "Jonathon",
      lastName: "Reyes",
      email: "j.reyes.finance@protonmail.com",
      phone: "(305) 555-0187",
      company: "Vesper Media Group",
    },
  ];
}

function buildAccountImposter(): Account[] {
  const [idA, idB] = ACCOUNT_IMPOSTER_IDS;
  // "Meridian Systems" vs "Meridian Solutions" -> nameSim ~0.667, well under
  // nameFloor (0.80) — a deceptive shared-prefix name that a human skimming
  // a list might mistake for the same company, but not similar enough to
  // clear the floor on its own. Domain/phone/address all disagree too.
  return [
    {
      id: idA,
      name: "Meridian Systems Inc",
      domain: "meridiansystems.com",
      phone: "(213) 555-0142",
      address: "901 Oak Ave, Fairhaven, WA 98101",
    },
    {
      id: idB,
      name: "Meridian Solutions LLC",
      domain: "veltrixdynamics.com",
      phone: "(773) 555-0169",
      address: "44 Chestnut Rd, Glendell, IL 60007",
    },
  ];
}

/* ------------------------------------------------------------------ *
 * THE GHOST. A sparse record whose only signal sits right at the tier
 * floor — score lands within a few points of `possible`, never near `high`.
 * ------------------------------------------------------------------ */

function buildContactGhost(): Contact[] {
  const [idA, idB] = CONTACT_GHOST_IDS;
  // "Cassian Holloway"/"Cassian Holliway" -> nameSim ~0.938; "Driftline
  // Capital Partners"/"...Ventures" -> companySim ~0.769. Both just clear
  // their floors (0.82 / 0.70); pairScore lands a few points above
  // `possible` (25) — readable near-misses, not scrambled noise.
  return [
    {
      id: idA,
      firstName: "Cassian",
      lastName: "Holloway",
      email: "cassian.holloway@gmail.com",
      phone: "(720) 555-0133",
      company: "Driftline Capital Partners",
    },
    {
      id: idB,
      firstName: "Cassian",
      lastName: "Holliway",
      email: "c.holloway.mercer@outlook.com",
      phone: "(720) 555-0288",
      company: "Driftline Capital Ventures",
    },
  ];
}

function buildAccountGhost(): Account[] {
  const [idA, idB] = ACCOUNT_GHOST_IDS;
  // "Thistledown Analytics"/"Thistledale Analytica" -> nameSim ~0.810, just
  // above nameFloor (0.80); round(nameMax * nameSim) lands exactly at
  // `possible` (20). Domain/phone/address all disagree.
  return [
    {
      id: idA,
      name: "Thistledown Analytics",
      domain: "thistledownanalytics.com",
      phone: "(512) 555-0155",
      address: "77 Meadow St, Ashford, GA 30301",
    },
    {
      id: idB,
      name: "Thistledale Analytica",
      domain: "quillfeatherdata.com",
      phone: "(206) 555-0177",
      address: "310 Vine Blvd, Brookhaven, OR 97201",
    },
  ];
}

/* ------------------------------------------------------------------ *
 * Self-checks. The generator asserts its own pathologies at generation time
 * (against data/pathology-formulas.ts) so a construction regression fails
 * loudly here, not quietly downstream once lib/match exists.
 * ------------------------------------------------------------------ */

function verifyPathologies(contacts: Contact[], accounts: Account[]): void {
  const cw = DEFAULT_SIGNAL_WEIGHTS.contact;
  const aw = DEFAULT_SIGNAL_WEIGHTS.account;
  const byId = <T extends { id: string }>(items: T[], id: string): T => {
    const found = items.find((item) => item.id === id);
    if (!found) throw new Error(`pathology record not found: ${id}`);
    return found;
  };

  // THE TWINS: both tiers agree `high` (>= 50 / >= 55), clearly.
  {
    const [idA, idB] = CONTACT_TWINS_IDS;
    const { score } = scoreContactPair(byId(contacts, idA), byId(contacts, idB), cw);
    if (score < 100) throw new Error(`THE TWINS (contact) too weak: score=${score}, want >= 100`);
  }
  {
    const [idA, idB] = ACCOUNT_TWINS_IDS;
    const { score } = scoreAccountPair(byId(accounts, idA), byId(accounts, idB), aw);
    if (score < 90) throw new Error(`THE TWINS (account) too weak: score=${score}, want >= 90`);
  }

  // THE CHAIN: A-B and B-C each clear `possible`; A-C is zero.
  {
    const [idA, idB, idC] = CONTACT_CHAIN_IDS;
    const a = byId(contacts, idA);
    const b = byId(contacts, idB);
    const c = byId(contacts, idC);
    const ab = scoreContactPair(a, b, cw).score;
    const bc = scoreContactPair(b, c, cw).score;
    const ac = scoreContactPair(a, c, cw).score;
    if (ab < 25) throw new Error(`THE CHAIN (contact) A-B too weak: ${ab}, want >= 25`);
    if (bc < 25) throw new Error(`THE CHAIN (contact) B-C too weak: ${bc}, want >= 25`);
    if (ac !== 0) throw new Error(`THE CHAIN (contact) A-C not isolated: ${ac}, want 0`);
  }
  {
    const [idA, idB, idC] = ACCOUNT_CHAIN_IDS;
    const a = byId(accounts, idA);
    const b = byId(accounts, idB);
    const c = byId(accounts, idC);
    const ab = scoreAccountPair(a, b, aw).score;
    const bc = scoreAccountPair(b, c, aw).score;
    const ac = scoreAccountPair(a, c, aw).score;
    if (ab < 20) throw new Error(`THE CHAIN (account) A-B too weak: ${ab}, want >= 20`);
    if (bc < 20) throw new Error(`THE CHAIN (account) B-C too weak: ${bc}, want >= 20`);
    if (ac !== 0) throw new Error(`THE CHAIN (account) A-C not isolated: ${ac}, want 0`);
  }

  // THE IMPOSTER: deceptively similar name, score refused (0, no edge).
  {
    const [idA, idB] = CONTACT_IMPOSTER_IDS;
    const a = byId(contacts, idA);
    const b = byId(contacts, idB);
    const { score, nameSim, companySim } = scoreContactPair(a, b, cw);
    if (nameSim < cw.nameFloor) throw new Error(`THE IMPOSTER (contact) name not deceptive enough: sim=${nameSim}`);
    if (companySim >= cw.companyFloor) throw new Error(`THE IMPOSTER (contact) company too similar: sim=${companySim}`);
    if (score !== 0) throw new Error(`THE IMPOSTER (contact) not refused: score=${score}, want 0`);
  }
  {
    const [idA, idB] = ACCOUNT_IMPOSTER_IDS;
    const a = byId(accounts, idA);
    const b = byId(accounts, idB);
    const { score, nameSim } = scoreAccountPair(a, b, aw);
    if (nameSim < 0.6) throw new Error(`THE IMPOSTER (account) name not deceptive enough: sim=${nameSim}`);
    if (nameSim >= aw.nameFloor) throw new Error(`THE IMPOSTER (account) name too similar: sim=${nameSim}, floor=${aw.nameFloor}`);
    if (score !== 0) throw new Error(`THE IMPOSTER (account) not refused: score=${score}, want 0`);
  }

  // THE GHOST: sits within a few points of `possible`, nowhere near `high`.
  {
    const [idA, idB] = CONTACT_GHOST_IDS;
    const a = byId(contacts, idA);
    const b = byId(contacts, idB);
    const { score } = scoreContactPair(a, b, cw);
    if (score < 25) throw new Error(`THE GHOST (contact) below possible: score=${score}, want >= 25`);
    if (score > 35) throw new Error(`THE GHOST (contact) not near the boundary: score=${score}, want <= 35`);
  }
  {
    const [idA, idB] = ACCOUNT_GHOST_IDS;
    const a = byId(accounts, idA);
    const b = byId(accounts, idB);
    const { score } = scoreAccountPair(a, b, aw);
    if (score < 20) throw new Error(`THE GHOST (account) below possible: score=${score}, want >= 20`);
    if (score > 30) throw new Error(`THE GHOST (account) not near the boundary: score=${score}, want <= 30`);
  }
}

/* ------------------------------------------------------------------ *
 * Entry point.
 * ------------------------------------------------------------------ */

export function generateCorpus(): { contacts: Contact[]; accounts: Account[] } {
  const contactRng = new Rng(derive(CORPUS_GENERATION_SEED, "contacts"));
  const accountRng = new Rng(derive(CORPUS_GENERATION_SEED, "accounts"));

  const pathologyContacts = [
    ...buildContactTwins(),
    ...buildContactChain(),
    ...buildContactImposter(),
    ...buildContactGhost(),
  ];
  const pathologyAccounts = [
    ...buildAccountTwins(),
    ...buildAccountChain(),
    ...buildAccountImposter(),
    ...buildAccountGhost(),
  ];

  const baseContacts = generateBaseContacts(
    contactRng,
    TOTAL_CONTACTS - pathologyContacts.length,
    0,
  );
  const baseAccounts = generateBaseAccounts(
    accountRng,
    TOTAL_ACCOUNTS - pathologyAccounts.length,
    0,
  );

  const contacts = [...baseContacts, ...pathologyContacts];
  const accounts = [...baseAccounts, ...pathologyAccounts];

  verifyPathologies(contacts, accounts);
  contactCorpusSchema.parse(contacts);
  accountCorpusSchema.parse(accounts);

  return { contacts, accounts };
}
