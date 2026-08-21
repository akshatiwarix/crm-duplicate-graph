import { configSchema, type Config } from "@/lib/domain/config";

/**
 * Base64url via btoa/atob rather than node:buffer, so the exact same codec
 * runs server-side (API route) and client-side (the console writing the
 * permalink as controls move) with no environment branching. The permalink
 * encodes `Config` only — `DedupeResult` is always recomputed, never
 * transported (PLAN.md § Data model).
 */
export function encodePermalink(config: Config): string {
  const json = JSON.stringify(config);
  const binary = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Throws (zod) if the payload doesn't decode to a valid Config. */
export function decodePermalink(encoded: string): Config {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const json = decodeURIComponent(
    Array.from(binary, (c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join(""),
  );
  return configSchema.parse(JSON.parse(json));
}
