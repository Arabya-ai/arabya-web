/**
 * Next.js instrumentation hook — loads Sentry for Contabo Node/Edge runtimes.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

/** Forward App Router request errors to Sentry when the helper exists. */
export async function onRequestError(...args: unknown[]) {
  const Sentry = await import("@sentry/nextjs");
  const capture = (
    Sentry as { captureRequestError?: (...a: unknown[]) => void }
  ).captureRequestError;
  if (typeof capture === "function") {
    capture(...args);
  }
}
