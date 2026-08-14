import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkRateLimit,
  clientIpFromHeaders,
  enforceRateLimit,
  enforceRateLimitKey,
  resetRateLimitForTests,
  saturateRateLimitForTests,
} from "./rate-limit";

afterEach(() => {
  resetRateLimitForTests();
  vi.useRealTimers();
});

describe("clientIpFromHeaders", () => {
  it("prefers Cloudflare connecting IP", () => {
    const h = new Headers({
      "cf-connecting-ip": "1.2.3.4",
      "x-forwarded-for": "9.9.9.9, 8.8.8.8",
    });
    expect(clientIpFromHeaders(h)).toBe("1.2.3.4");
  });

  it("falls back to first X-Forwarded-For hop", () => {
    const h = new Headers({ "x-forwarded-for": "9.9.9.9, 8.8.8.8" });
    expect(clientIpFromHeaders(h)).toBe("9.9.9.9");
  });

  it("returns unknown when empty", () => {
    expect(clientIpFromHeaders(new Headers())).toBe("unknown");
  });
});

describe("checkRateLimit", () => {
  it("allows traffic under the limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("t:a", 5).ok).toBe(true);
    }
  });

  it("blocks after the limit with Retry-After", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("t:b", 3);
    const blocked = checkRateLimit("t:b", 3);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1);
    expect(blocked.remaining).toBe(0);
  });

  it("keeps IPs independent", () => {
    for (let i = 0; i < 2; i++) checkRateLimit("t:ip1", 2);
    expect(checkRateLimit("t:ip1", 2).ok).toBe(false);
    expect(checkRateLimit("t:ip2", 2).ok).toBe(true);
  });

  it("does not mix prefixes", () => {
    for (let i = 0; i < 2; i++) checkRateLimit("search:1", 2);
    expect(checkRateLimit("search:1", 2).ok).toBe(false);
    expect(checkRateLimit("study:1", 2).ok).toBe(true);
  });

  it("slides the window after time passes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    for (let i = 0; i < 2; i++) checkRateLimit("t:slide", 2);
    expect(checkRateLimit("t:slide", 2).ok).toBe(false);
    vi.setSystemTime(new Date("2026-01-01T00:01:01Z"));
    expect(checkRateLimit("t:slide", 2).ok).toBe(true);
  });
});

describe("enforce helpers", () => {
  it("returns null when allowed and 429 when blocked", async () => {
    const req = new Request("https://www.arabya.org/api/search", {
      headers: { "cf-connecting-ip": "5.5.5.5" },
    });
    expect(enforceRateLimit(req, { prefix: "search", limit: 1 })).toBeNull();
    const blocked = enforceRateLimit(req, { prefix: "search", limit: 1 });
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    expect(blocked!.headers.get("Retry-After")).toBeTruthy();
  });

  it("supports explicit email keys", () => {
    expect(enforceRateLimitKey("sync", "a@b.c", 1)).toBeNull();
    const blocked = enforceRateLimitKey("sync", "a@b.c", 1);
    expect(blocked?.status).toBe(429);
  });

  it("fails closed with 503 when bucket map is saturated", () => {
    saturateRateLimitForTests();
    const blocked = checkRateLimit("new:never-seen", 5);
    expect(blocked.ok).toBe(false);
    expect(blocked.saturated).toBe(true);
    const res = enforceRateLimitKey("prefix", "fresh-key", 5);
    expect(res?.status).toBe(503);
  });
});
