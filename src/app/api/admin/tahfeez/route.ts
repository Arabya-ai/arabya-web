import { NextResponse } from "next/server";
import { adminListTahfeezSummaries } from "@/lib/cloud-sync";
import { enforceRateLimitKey } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/require-role";
import { isSuperAdminEmail } from "@/lib/roles";

export const dynamic = "force-dynamic";

/** Super-admin: overview of all tahfeez portfolios. */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  if (!isSuperAdminEmail(gate.email)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const limited = enforceRateLimitKey("admin-tahfeez", gate.email, 60);
  if (limited) return limited;

  try {
    const data = await adminListTahfeezSummaries(gate.email);
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
