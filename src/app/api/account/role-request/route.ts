import { NextResponse } from "next/server";
import {
  createRoleRequest,
  getRoleRequest,
  isCloudSyncConfigured,
} from "@/lib/cloud-sync";
import { enforceRateLimitKey } from "@/lib/rate-limit";
import { requireSession } from "@/lib/require-role";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireSession();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("role-request-get", gate.email, 30);
  if (limited) return limited;
  if (!isCloudSyncConfigured()) {
    return NextResponse.json(
      { ok: false, error: "not_configured", request: null },
      { status: 503 },
    );
  }
  try {
    const data = await getRoleRequest(gate.email);
    return NextResponse.json({ ok: true, request: data.request });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const gate = await requireSession();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("role-request-post", gate.email, 10);
  if (limited) return limited;
  if (!isCloudSyncConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  let body: { message?: string; targetRole?: string };
  try {
    body = (await request.json()) as { message?: string; targetRole?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // Admin (super admin) is never self-requestable — only member → editor
  if (body.targetRole === "admin") {
    return NextResponse.json(
      { ok: false, error: "admin_not_requestable" },
      { status: 403 },
    );
  }
  const targetRole = "editor";

  if (gate.role === "admin") {
    return NextResponse.json({ ok: false, error: "already_admin" }, { status: 400 });
  }
  if (gate.role !== "member") {
    return NextResponse.json({ ok: false, error: "already_elevated" }, { status: 400 });
  }

  try {
    const data = await createRoleRequest(
      { email: gate.email, name: gate.name, image: gate.image },
      String(body.message || ""),
      targetRole,
    );
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
