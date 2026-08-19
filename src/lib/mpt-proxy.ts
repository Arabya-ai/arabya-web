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

/**
 * Detect LLM responses that contain Cloudflare challenge pages or raw HTML
 * instead of real content. MPT returns 200 but the data field holds garbage.
 */
function detectLlmGarbage(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const data = (payload as Record<string, unknown>).data;
  if (!data || typeof data !== "object") return false;
  const fields = data as Record<string, unknown>;
  for (const value of Object.values(fields)) {
    if (
      typeof value === "string" &&
      value.length > 50 &&
      (value.includes("<!DOCTYPE") ||
        value.includes("<html") ||
        value.includes("Just a moment") ||
        value.startsWith("Error: <!"))
    ) {
      return true;
    }
  }
  return false;
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

    const raw = await readUpstreamJson(upstream);
    if (detectLlmGarbage(raw)) {
      return NextResponse.json(
        { ok: false, error: "llm_blocked", message: "LLM API returned an error page instead of content." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
    const payload = rewriteMptValue(raw);
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
