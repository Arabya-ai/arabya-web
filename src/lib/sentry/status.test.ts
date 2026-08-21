import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getSentryStatus } from "@/lib/sentry/status";

describe("getSentryStatus", () => {
  const keys = [
    "NEXT_PUBLIC_SENTRY_DSN",
    "SENTRY_DSN",
    "SENTRY_ORG",
    "SENTRY_PROJECT",
    "SENTRY_AUTH_TOKEN",
    "SENTRY_ENABLE_DEV",
  ] as const;
  const backup: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of keys) {
      backup[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of keys) {
      if (backup[k] === undefined) delete process.env[k];
      else process.env[k] = backup[k];
    }
  });

  it("reports unconfigured when DSN missing", () => {
    const s = getSentryStatus();
    expect(s.configured).toBe(false);
    expect(s.issuesFetchable).toBe(false);
    expect(s.messageAr).toMatch(/غير مفعّل/);
  });

  it("configured but not issues-fetchable without auth", () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN =
      "https://abc123@o1.ingest.sentry.io/99";
    const s = getSentryStatus();
    expect(s.configured).toBe(true);
    expect(s.dsnHost).toContain("ingest.sentry.io");
    expect(s.issuesFetchable).toBe(false);
  });

  it("issuesFetchable when org/project/token set", () => {
    process.env.SENTRY_DSN = "https://abc123@o1.ingest.sentry.io/99";
    process.env.SENTRY_ORG = "arabya";
    process.env.SENTRY_PROJECT = "arabya-web";
    process.env.SENTRY_AUTH_TOKEN = "sntrys_test";
    const s = getSentryStatus();
    expect(s.issuesFetchable).toBe(true);
  });
});
