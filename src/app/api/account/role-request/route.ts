import { NextResponse } from "next/server";
import {
  createRoleRequest,
  getRoleRequest,
  isCloudSyncConfigured,
} from "@/lib/cloud-sync";
import { requireSession } from "@/lib/require-role";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireSession();
  if ("error" in gate) return gate.error;
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
  if (!isCloudSyncConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  let body: { message?: string };
  try {
    body = (await request.json()) as { message?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  try {
    const data = await createRoleRequest(
      { email: gate.email, name: gate.name, image: gate.image },
      String(body.message || ""),
    );
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
