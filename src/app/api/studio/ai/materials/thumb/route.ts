import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import {
  MPT_THUMB_MAX_BYTES,
  mptMaterialImageContentType,
  resolveMptLocalVideoFile,
} from "@/lib/mpt-engine";
import { MPT_FILE_LIMIT, requireMptSession } from "@/lib/mpt-proxy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireMptSession(MPT_FILE_LIMIT);
  if ("error" in gate) return gate.error;

  const file = new URL(request.url).searchParams.get("file") || "";
  const type = mptMaterialImageContentType(file);
  const abs = resolveMptLocalVideoFile(file);
  if (!type || !abs) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  try {
    const stat = await fs.stat(abs);
    if (!stat.isFile() || stat.size <= 0 || stat.size > MPT_THUMB_MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    const body = await fs.readFile(abs);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
}
