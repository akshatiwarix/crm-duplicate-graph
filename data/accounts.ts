import rawAccounts from "./accounts.json";
import { accountCorpusSchema, type Account } from "@/lib/domain/account";
import { DEFAULT_CORPUS_ID } from "@/lib/domain/defaults";

/**
 * The committed account corpus, validated on load.
 *
 * Nobody else writes this file — validation here is a tripwire on the
 * generator, not defensive theatre.
 */
const ACCOUNTS: Account[] = accountCorpusSchema.parse(rawAccounts);

export function getAccounts(corpusId: string): Account[] {
  if (corpusId !== DEFAULT_CORPUS_ID) {
    throw new Error(`unknown corpus: ${corpusId}`);
  }
  return ACCOUNTS;
}
