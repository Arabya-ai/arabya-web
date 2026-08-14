import { NextResponse } from "next/server";
import {
  isCloudSyncConfigured,
  studioCreateUpload,
  studioListUploads,
} from "@/lib/cloud-sync";
import { enforceRateLimitKey } from "@/lib/rate-limit";
import { requireSession } from "@/lib/require-role";
import { canAccessEditorialTools } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireSession();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("studio-uploads", gate.email, 60);
  if (limited) return limited;
  if (!canAccessEditorialTools(gate.role)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  if (!isCloudSyncConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  try {
    const data = await studioListUploads(gate.email);
    return NextResponse.json({ ok: true, ...data });
  } catch {
    return NextResponse.json({ ok: false, error: "upstream_failed" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const gate = await requireSession();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("studio-uploads-post", gate.email, 30);
  if (limited) return limited;
  if (!canAccessEditorialTools(gate.role)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  if (!isCloudSyncConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  let body: { filename?: string; payload?: string; notes?: string; kind?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  try {
    const data = await studioCreateUpload(gate.email, {
      filename: String(body.filename || "upload.json"),
      payload: String(body.payload || ""),
      notes: body.notes,
      kind: body.kind,
    });
    return NextResponse.json({ ok: true, ...data });
  } catch {
    return NextResponse.json({ ok: false, error: "upstream_failed" }, { status: 502 });
  }
}
