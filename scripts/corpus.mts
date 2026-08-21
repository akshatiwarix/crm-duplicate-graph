/**
 * Regenerates the committed corpora. The output is checked in, so nobody
 * needs to run this to reproduce a result — but running it must produce
 * byte-identical files, which is what makes "fixed seed" a claim rather than
 * a hope.
 */
import { writeFileSync } from "node:fs";
import { generateCorpus } from "@/data/generate";

const { contacts, accounts } = generateCorpus();

writeFileSync("data/contacts.json", JSON.stringify(contacts, null, 2) + "\n");
writeFileSync("data/accounts.json", JSON.stringify(accounts, null, 2) + "\n");

console.log(`data/contacts.json  ${contacts.length} contacts`);
console.log(`data/accounts.json  ${accounts.length} accounts`);
