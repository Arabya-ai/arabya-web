import { NextResponse } from "next/server";
import { getMptApiBase, joinMptUrl } from "@/lib/mpt-engine";
import { requireMptSession, MPT_JSON_LIMIT } from "@/lib/mpt-proxy";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireMptSession(MPT_JSON_LIMIT);
  if ("error" in gate) return gate.error;

  const base = getMptApiBase();
  if (!base) {
    return NextResponse.json({
      ok: false,
      configured: false,
      online: false,
      docs: null,
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const url = joinMptUrl(base, "/api/v1/tasks?page=1&page_size=1");
    const upstream = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
      redirect: "manual",
    });
    return NextResponse.json({
      ok: upstream.ok,
      configured: true,
      online: upstream.ok,
      docs: `${base}/docs`,
    });
  } catch {
    return NextResponse.json({
      ok: false,
      configured: true,
      online: false,
      docs: `${base}/docs`,
    });
  } finally {
    clearTimeout(timer);
  }
}
