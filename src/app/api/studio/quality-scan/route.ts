import { NextResponse } from "next/server";
import { requireSession } from "@/lib/require-role";
import { canAccessStudio } from "@/lib/roles";
import { scanQualityIssues } from "@/lib/quality-scan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const gate = await requireSession();
  if ("error" in gate) return gate.error;
  if (!canAccessStudio(gate.role)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  try {
    const items = await scanQualityIssues();
    return NextResponse.json({ ok: true, items, total: items.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "scan_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
