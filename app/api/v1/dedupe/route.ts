import { NextResponse } from "next/server";
import { configSchema } from "@/lib/domain/config";
import { computeDedupeResult } from "@/lib/compute";

/** No auth, no persistence, no rate limit — Config in, full DedupeResult out. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid Config", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    return NextResponse.json(computeDedupeResult(parsed.data));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown error" },
      { status: 400 },
    );
  }
}
