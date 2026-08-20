/** Runtime config for لغوي (project quota + AI). */

export function lughawiMonthlyQuotaChars(): number {
  const raw = Number(process.env.LUGHAWI_MONTHLY_QUOTA_CHARS ?? "15000");
  if (!Number.isFinite(raw) || raw < 0) return 15_000;
  return Math.floor(raw);
}

export function lughawiMaxGuestChars(): number {
  const raw = Number(process.env.LUGHAWI_MAX_GUEST_CHARS ?? "8000");
  if (!Number.isFinite(raw) || raw < 500) return 8_000;
  return Math.floor(raw);
}

export function lughawiProjectProvider(): string {
  return (process.env.LUGHAWI_PROJECT_AI_PROVIDER ?? "openai").trim().toLowerCase();
}

export function lughawiProjectApiKey(): string | undefined {
  const key = process.env.LUGHAWI_PROJECT_AI_KEY?.trim();
  return key || undefined;
}

export function lughawiCredentialsSecret(): string {
  return (
    process.env.LUGHAWI_CREDENTIALS_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "arabya-lughawi-dev-only-change-me"
  );
}
