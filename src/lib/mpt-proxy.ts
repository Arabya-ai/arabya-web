import { NextResponse } from "next/server";
import {
  getMptApiBase,
  isAllowedMptApiPath,
  joinMptUrl,
  rewriteMptValue,
} from "@/lib/mpt-engine";
import { enforceRateLimitKey } from "@/lib/rate-limit";
import { requireStudio } from "@/lib/require-role";

export const MPT_JSON_LIMIT = 40;
export const MPT_GENERATE_LIMIT = 8;
export const MPT_FILE_LIMIT = 60;

export async function requireMptSession(limit: number) {
  const gate = await requireStudio();
  if ("error" in gate) return { error: gate.error };
  const limited = enforceRateLimitKey("studio-mpt", gate.email, limit);
  if (limited) return { error: limited };
  return gate;
}

export function engineUnconfiguredResponse() {
  return NextResponse.json(
    { ok: false, error: "engine_unconfigured", configured: false },
    { status: 503 },
  );
}

export function engineUnreachableResponse() {
  return NextResponse.json(
    { ok: false, error: "engine_unreachable", configured: true },
    { status: 503 },
  );
}

async function readUpstreamJson(upstream: Response): Promise<unknown> {
  const text = await upstream.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text.slice(0, 400) };
  }
}

export async function proxyMptJson(opts: {
  method: string;
  pathname: string;
  search?: string;
  body?: unknown;
  timeoutMs?: number;
}): Promise<Response> {
  const base = getMptApiBase();
  if (!base) return engineUnconfiguredResponse();
  if (!isAllowedMptApiPath(opts.pathname)) {
    return NextResponse.json({ ok: false, error: "forbidden_path" }, { status: 400 });
  }

  let url: URL;
  try {
    url = joinMptUrl(base, `${opts.pathname}${opts.search || ""}`);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_path" }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 45_000);

  try {
    const upstream = await fetch(url, {
      method: opts.method,
      headers:
        opts.body === undefined
          ? { Accept: "application/json" }
          : { Accept: "application/json", "Content-Type": "application/json" },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: controller.signal,
      cache: "no-store",
      redirect: "manual",
    });

    const payload = rewriteMptValue(await readUpstreamJson(upstream));
    return NextResponse.json(payload, {
      status: upstream.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return engineUnreachableResponse();
  } finally {
    clearTimeout(timer);
  }
}
