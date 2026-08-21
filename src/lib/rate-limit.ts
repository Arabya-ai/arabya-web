/**
 * In-memory sliding-window rate limiter for Contabo single-instance deploys.
 *
 * Suitable while arabya-web runs as one Node/PM2 process. If you move to
 * multiple instances, replace the Map store with Redis/Upstash using the same
 * `enforceRateLimit` / `enforceRateLimitKey` surface so call sites stay unchanged.
 */

import { NextResponse } from "next/server";

const WINDOW_MS = 60_000;
const MAX_BUCKETS = 50_000;
const SWEEP_EVERY_MS = 60_000;

/** Every /api request — enforced in middleware before route handlers. */
export const API_BASELINE_LIMIT = 120;
/** OAuth sign-in / session endpoints per IP. */
export const AUTH_RATE_LIMIT = 30;
/** Bulk Quran search (`?all=1`) per IP — caps scraping throughput. */
export const SEARCH_BULK_LIMIT = 10;

const hits = new Map<string, number[]>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_EVERY_MS) return;
  lastSweep = now;
  const cutoff = now - WINDOW_MS;
  for (const [key, stamps] of hits) {
    const next = stamps.filter((t) => t > cutoff);
    if (next.length === 0) hits.delete(key);
    else hits.set(key, next);
  }
}

/** Trusted client IP: Cloudflare first, then LiteSpeed X-Real-IP (not spoofable XFF). */
export function clientIpFromHeaders(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  // Contabo LiteSpeed typically sets X-Real-IP from the true peer.
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  // Only as last resort — first XFF hop is client-controllable without a trusted proxy overwrite.
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}

export function clientIp(request: Request): string {
  return clientIpFromHeaders(request.headers);
}

export type RateLimitCheck = {
  ok: boolean;
  retryAfterSec: number;
  remaining: number;
  /** Saturated store → callers should return 503, not allow. */
  saturated?: boolean;
};

/**
 * Record one hit for `bucketKey`. Fail-closed when the map is saturated so new
 * identities cannot bypass limits by exhausting buckets.
 */
export function checkRateLimit(
  bucketKey: string,
  limit: number,
  windowMs: number = WINDOW_MS,
): RateLimitCheck {
  const now = Date.now();
  sweep(now);

  if (hits.size >= MAX_BUCKETS && !hits.has(bucketKey)) {
    return { ok: false, retryAfterSec: 60, remaining: 0, saturated: true };
  }

  const cutoff = now - windowMs;
  const prev = hits.get(bucketKey) ?? [];
  const recent = prev.filter((t) => t > cutoff);

  if (recent.length >= limit) {
    const oldest = recent[0] ?? now;
    const retryAfterSec = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000),
    );
    hits.set(bucketKey, recent);
    return { ok: false, retryAfterSec, remaining: 0 };
  }

  recent.push(now);
  hits.set(bucketKey, recent);
  return {
    ok: true,
    retryAfterSec: 0,
    remaining: Math.max(0, limit - recent.length),
  };
}

/** Test helper — clears all buckets. */
export function resetRateLimitForTests() {
  hits.clear();
  lastSweep = 0;
}

/** Test helper — fill the map to the saturation threshold. */
export function saturateRateLimitForTests() {
  for (let i = 0; i < MAX_BUCKETS; i++) {
    hits.set(`__sat:${i}`, [Date.now()]);
  }
}

function blockedResponse(result: RateLimitCheck): NextResponse {
  if (result.saturated) {
    return NextResponse.json(
      { ok: false, error: "rate_limit_unavailable" },
      {
        status: 503,
        headers: {
          "Retry-After": String(result.retryAfterSec || 60),
          "Cache-Control": "no-store",
        },
      },
    );
  }
  return NextResponse.json(
    { ok: false, error: "rate_limited" },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSec),
        "Cache-Control": "no-store",
      },
    },
  );
}

/**
 * Rate-limit by IP (or explicit key). Returns a 429/503 Response when blocked,
 * otherwise null so the route can continue.
 */
export function enforceRateLimit(
  request: Request,
  opts: { prefix: string; limit: number; key?: string },
): Response | null {
  const id = opts.key?.trim() || clientIp(request);
  const result = checkRateLimit(`${opts.prefix}:${id}`, opts.limit);
  if (result.ok) return null;
  return blockedResponse(result);
}

/** Rate-limit with an already-known key (e.g. email after auth). */
export function enforceRateLimitKey(
  prefix: string,
  key: string,
  limit: number,
): Response | null {
  const result = checkRateLimit(`${prefix}:${key}`, limit);
  if (result.ok) return null;
  return blockedResponse(result);
}

/** Global baseline for all `/api/*` traffic (middleware + optional route reuse). */
export function enforceApiBaseline(request: Request): Response | null {
  return enforceRateLimit(request, {
    prefix: "api-baseline",
    limit: API_BASELINE_LIMIT,
  });
}
