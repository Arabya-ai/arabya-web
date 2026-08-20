import { NextResponse } from "next/server";
import { pageRemoteSiyar } from "@/lib/remote-siyar";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy paginated sīrah/history events from upstream GitHub JSON —
 * Arabya does not vendor the ~12MB dump.
 */
export async function GET(req: Request) {
  const limited = enforceRateLimit(req, { prefix: "remote-siyar", limit: 40 });
  if (limited) return limited;

  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") || "1");
  const pageSize = Number(url.searchParams.get("pageSize") || "20");
  const q = url.searchParams.get("q") || "";
  try {
    const data = await pageRemoteSiyar({ page, pageSize, q });
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "remote siyar failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
