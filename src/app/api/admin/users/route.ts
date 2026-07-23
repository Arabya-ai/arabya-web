import { NextResponse } from "next/server";
import { adminListUsers, isCloudSyncConfigured } from "@/lib/cloud-sync";
import { requireAdmin } from "@/lib/require-role";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  if (!isCloudSyncConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  const url = new URL(request.url);
  try {
    const data = await adminListUsers(gate.email, {
      q: url.searchParams.get("q") || "",
      role: url.searchParams.get("role") || "",
      limit: Number(url.searchParams.get("limit") || 50),
      offset: Number(url.searchParams.get("offset") || 0),
    });
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
