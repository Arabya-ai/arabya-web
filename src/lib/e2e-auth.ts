/**
 * Local/E2E-only credentials sign-in.
 * Never active when NODE_ENV=production — Contabo stays Google-only.
 */
export function isE2eAuthEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const raw = (process.env.ARABYA_E2E_AUTH || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export const E2E_AUTH_PROVIDER_ID = "e2e";

export const E2E_DEFAULT_EMAIL =
  (process.env.ARABYA_E2E_EMAIL || "e2e@arabya.local").trim().toLowerCase();
