import { NextResponse } from "next/server";
import { enforceRateLimitKey } from "@/lib/rate-limit";
import { requireSession } from "@/lib/require-role";
import { canAccessEditorialTools } from "@/lib/roles";
import { scanQualityIssues } from "@/lib/quality-scan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const gate = await requireSession();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("studio-quality-scan", gate.email, 30);
  if (limited) return limited;
  if (!canAccessEditorialTools(gate.role)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  try {
    const { items, coverage } = await scanQualityIssues();
    return NextResponse.json({
      ok: true,
      items,
      coverage,
      total: items.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "scan_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
