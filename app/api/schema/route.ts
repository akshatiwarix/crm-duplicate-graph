import { NextResponse } from "next/server";
import { z } from "zod";
import { configSchema } from "@/lib/domain/config";
import { dedupeResultSchema } from "@/lib/domain/result";

/** Rendered straight from the zod schemas so it cannot drift from the implementation. */
export async function GET() {
  return NextResponse.json({
    request: z.toJSONSchema(configSchema),
    response: z.toJSONSchema(dedupeResultSchema),
  });
}
