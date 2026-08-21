/**
 * Server-side Sentry — Contabo Node runtime (optional).
 * No-op when SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN is unset.
 */
import * as Sentry from "@sentry/nextjs";

const dsn =
  process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT?.trim() ||
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
      process.env.NODE_ENV ||
      "production",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.08"),
    enabled:
      process.env.NODE_ENV === "production" ||
      process.env.SENTRY_ENABLE_DEV === "1",
  });
}
