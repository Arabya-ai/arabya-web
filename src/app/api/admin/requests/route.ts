import { NextResponse } from "next/server";
import {
  adminListRoleRequests,
  adminReviewRoleRequest,
  isCloudSyncConfigured,
} from "@/lib/cloud-sync";
import { requireAdmin } from "@/lib/require-role";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  if (!isCloudSyncConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  const status = new URL(request.url).searchParams.get("status") || "pending";
  try {
    const data = await adminListRoleRequests(gate.email, status);
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  if (!isCloudSyncConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  let body: { requestId?: string; decision?: string; reviewNote?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (
    !body.requestId ||
    (body.decision !== "approved" && body.decision !== "rejected")
  ) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  try {
    const data = await adminReviewRoleRequest(
      gate.email,
      body.requestId,
      body.decision,
      body.reviewNote,
    );
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
