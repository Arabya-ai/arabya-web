import { NextResponse } from "next/server";
import {
  getMptApiBase,
  isSafeMptFilePath,
  joinMptUrl,
} from "@/lib/mpt-engine";
import {
  engineUnconfiguredResponse,
  engineUnreachableResponse,
  MPT_FILE_LIMIT,
  requireMptSession,
} from "@/lib/mpt-proxy";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, ctx: Ctx) {
  const gate = await requireMptSession(MPT_FILE_LIMIT);
  if ("error" in gate) return gate.error;

  const base = getMptApiBase();
  if (!base) return engineUnconfiguredResponse();

  const { path: parts } = await ctx.params;
  if (!isSafeMptFilePath(parts)) {
    return NextResponse.json({ ok: false, error: "invalid_path" }, { status: 400 });
  }

  let url: URL;
  try {
    url = joinMptUrl(base, `/tasks/${parts.join("/")}`);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_path" }, { status: 400 });
  }

  const range = request.headers.get("range");
  const headers = new Headers({ Accept: "*/*" });
  if (range) headers.set("Range", range);

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
      redirect: "manual",
    });

    if (upstream.status === 301 || upstream.status === 302) {
      return NextResponse.json({ ok: false, error: "redirect_blocked" }, { status: 502 });
    }

    const out = new Headers();
    const pass = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "cache-control",
    ];
    for (const key of pass) {
      const value = upstream.headers.get(key);
      if (value) out.set(key, value);
    }
    if (!out.has("cache-control")) out.set("Cache-Control", "private, no-store");
    out.set("X-Content-Type-Options", "nosniff");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: out,
    });
  } catch {
    return engineUnreachableResponse();
  }
}
