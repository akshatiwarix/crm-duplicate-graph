import { getContacts } from "@/data/contacts";
import { getAccounts } from "@/data/accounts";
import { matchContacts, matchAccounts } from "@/lib/match";
import { buildClusters } from "@/lib/graph";
import type { Contact } from "@/lib/domain/contact";
import type { Account } from "@/lib/domain/account";
import type { Config } from "@/lib/domain/config";
import type { DedupeResult } from "@/lib/domain/result";

/**
 * The single pipeline composition: Config -> DedupeResult. Used by the sweep
 * script, the API route, and the console — one place wires lib/match and
 * lib/graph together, so nothing above this recomputes a score or a cluster
 * independently (PLAN.md § architecture rule 4).
 */
export function computeDedupeResult(
  config: Config,
  corpus?: { contacts: Contact[]; accounts: Account[] },
): DedupeResult {
  const contacts = corpus?.contacts ?? getContacts(config.corpusId);
  const accounts = corpus?.accounts ?? getAccounts(config.corpusId);

  const contactEdges = matchContacts(contacts, config.weights.contact, config.tiers.contact);
  const accountEdges = matchAccounts(accounts, config.weights.account, config.tiers.account);

  return {
    config,
    contactClusters: buildClusters(contactEdges),
    accountClusters: buildClusters(accountEdges),
  };
}
