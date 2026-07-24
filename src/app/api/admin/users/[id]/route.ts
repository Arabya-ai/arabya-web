import { NextResponse } from "next/server";
import {
  adminBanUser,
  adminDeleteUser,
  adminSetRole,
  isCloudSyncConfigured,
} from "@/lib/cloud-sync";
import { canApproveAdminRole } from "@/lib/roles";
import { requireAdmin } from "@/lib/require-role";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  if (!isCloudSyncConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  const { id } = await ctx.params;
  let body: { role?: string; reason?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (body.role !== "user" && body.role !== "editor" && body.role !== "admin") {
    return NextResponse.json({ ok: false, error: "invalid_role" }, { status: 400 });
  }
  if (body.role === "admin" && !canApproveAdminRole(gate.email)) {
    return NextResponse.json(
      { ok: false, error: "super_admin_required" },
      { status: 403 },
    );
  }
  try {
    const data = await adminSetRole(
      gate.email,
      decodeURIComponent(id),
      body.role,
      body.reason,
    );
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function POST(request: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  if (!isCloudSyncConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  const { id } = await ctx.params;
  let body: { action?: string; banned?: boolean; reason?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (body.action !== "ban") {
    return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
  }
  try {
    const data = await adminBanUser(
      gate.email,
      decodeURIComponent(id),
      body.banned !== false,
      body.reason,
    );
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  if (!isCloudSyncConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  const { id } = await ctx.params;
  let reason = "";
  try {
    const body = (await request.json()) as { reason?: string };
    reason = body.reason || "";
  } catch {
    /* optional */
  }
  try {
    const data = await adminDeleteUser(gate.email, decodeURIComponent(id), reason);
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
