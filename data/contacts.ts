import rawContacts from "./contacts.json";
import { contactCorpusSchema, type Contact } from "@/lib/domain/contact";
import { DEFAULT_CORPUS_ID } from "@/lib/domain/defaults";

/**
 * The committed contact corpus, validated on load.
 *
 * Nobody else writes this file — validation here is a tripwire on the
 * generator, not defensive theatre.
 */
const CONTACTS: Contact[] = contactCorpusSchema.parse(rawContacts);

export function getContacts(corpusId: string): Contact[] {
  if (corpusId !== DEFAULT_CORPUS_ID) {
    throw new Error(`unknown corpus: ${corpusId}`);
  }
  return CONTACTS;
}
