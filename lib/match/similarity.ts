import { distance } from "fastest-levenshtein";

/**
 * `similarity(a, b) = 1 - levenshtein(a, b) / max(len(a), len(b), 1)`
 * (PLAN.md § Method). Range 0-1. Callers pass already-normalized strings.
 */
export function similarity(a: string, b: string): number {
  const len = Math.max(a.length, b.length, 1);
  return 1 - distance(a, b) / len;
}
