import { NextResponse } from "next/server";
import { adminGetStats, isCloudSyncConfigured } from "@/lib/cloud-sync";
import { requireAdmin } from "@/lib/require-role";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  if (!isCloudSyncConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  try {
    const data = await adminGetStats(gate.email);
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
