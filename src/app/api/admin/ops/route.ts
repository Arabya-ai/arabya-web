import { NextResponse } from "next/server";
import { buildOpsSnapshot } from "@/lib/ops/snapshot";
import { enforceRateLimitKey } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/require-role";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("admin-ops", gate.email, 40);
  if (limited) return limited;
  try {
    const snapshot = await buildOpsSnapshot();
    return NextResponse.json({ ok: true, ...snapshot });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
