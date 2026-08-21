/**
 * Client-side Sentry (Next 16+ / Turbopack-compatible).
 * Contabo: no-op when NEXT_PUBLIC_SENTRY_DSN is unset.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
      process.env.NODE_ENV ||
      "production",
    tracesSampleRate: Number(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || "0.08",
    ),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    enabled:
      process.env.NODE_ENV === "production" ||
      process.env.NEXT_PUBLIC_SENTRY_ENABLE_DEV === "1",
    ignoreErrors: [
      "ResizeObserver loop",
      "Non-Error promise rejection captured",
      "AbortError",
    ],
  });
}
