/** Runtime config for لغوي (project quota + multi-provider Auto pool). */

import type { AiProviderId } from "@/lib/lughawi/types";

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

const PROVIDERS: AiProviderId[] = [
  "groq",
  "google",
  "openrouter",
  "openai",
  "anthropic",
];

export interface ProjectAiSlot {
  provider: AiProviderId;
  apiKey: string;
  model?: string;
}

/**
 * Build the project Auto pool from env.
 *
 * Supported forms:
 * - LUGHAWI_PROJECT_AI_KEY + LUGHAWI_PROJECT_AI_PROVIDER (single)
 * - LUGHAWI_GROQ_API_KEY / LUGHAWI_GOOGLE_API_KEY / LUGHAWI_OPENAI_API_KEY /
 *   LUGHAWI_ANTHROPIC_API_KEY / LUGHAWI_OPENROUTER_API_KEY
 * - LUGHAWI_PROJECT_AI_POOL=groq:key1|google:key2|openai:key3
 * - Optional models: LUGHAWI_GROQ_MODEL, LUGHAWI_OPENAI_MODEL, …
 */
export function lughawiProjectAiPool(): ProjectAiSlot[] {
  const slots: ProjectAiSlot[] = [];
  const seen = new Set<string>();

  function add(provider: string, apiKey: string | undefined, model?: string) {
    const p = provider.trim().toLowerCase();
    const key = apiKey?.trim();
    if (!key) return;
    if (!PROVIDERS.includes(p as AiProviderId)) return;
    const id = `${p}:${key.slice(-8)}`;
    if (seen.has(id)) return;
    seen.add(id);
    slots.push({
      provider: p as AiProviderId,
      apiKey: key,
      model: model?.trim() || undefined,
    });
  }

  const poolRaw = process.env.LUGHAWI_PROJECT_AI_POOL?.trim();
  if (poolRaw) {
    for (const part of poolRaw.split("|")) {
      const [prov, ...rest] = part.split(":");
      const key = rest.join(":").trim();
      if (prov && key) add(prov, key);
    }
  }

  add("groq", process.env.LUGHAWI_GROQ_API_KEY, process.env.LUGHAWI_GROQ_MODEL);
  add(
    "google",
    process.env.LUGHAWI_GOOGLE_API_KEY,
    process.env.LUGHAWI_GOOGLE_MODEL,
  );
  add(
    "openrouter",
    process.env.LUGHAWI_OPENROUTER_API_KEY,
    process.env.LUGHAWI_OPENROUTER_MODEL,
  );
  add(
    "openai",
    process.env.LUGHAWI_OPENAI_API_KEY,
    process.env.LUGHAWI_OPENAI_MODEL,
  );
  add(
    "anthropic",
    process.env.LUGHAWI_ANTHROPIC_API_KEY,
    process.env.LUGHAWI_ANTHROPIC_MODEL,
  );

  // Legacy single-key pair last (or first if pool empty — add always as fallback)
  add(lughawiProjectProvider(), lughawiProjectApiKey());

  // Prefer fast/cheap providers first for Auto (Cursor-like routing bias)
  const order: Record<string, number> = {
    groq: 0,
    google: 1,
    openrouter: 2,
    openai: 3,
    anthropic: 4,
  };
  slots.sort(
    (a, b) => (order[a.provider] ?? 9) - (order[b.provider] ?? 9),
  );
  return slots;
}
