/** Runtime config for لغوي (project quota + multi-key Auto pool). */

import { listAdminPoolDecrypted } from "@/lib/lughawi/admin-pool-store";
import { existsSync, readFileSync } from "node:fs";
import type { AiProviderId } from "@/lib/lughawi/types";

/** Monthly free words on project/admin keys (default 1500). */
export function lughawiMonthlyQuotaWords(): number {
  const fromWords = Number(process.env.LUGHAWI_MONTHLY_QUOTA_WORDS ?? "");
  if (Number.isFinite(fromWords) && fromWords > 0) return Math.floor(fromWords);
  // Legacy: chars env ≈ words when owner still uses old var (~15000 chars → keep as chars/4 heuristic only if WORDS unset)
  const raw = Number(process.env.LUGHAWI_MONTHLY_QUOTA_CHARS ?? "1500");
  if (!Number.isFinite(raw) || raw < 0) return 1_500;
  // If someone still has 15000 chars configured, treat as words only when WORDS unset and value looks like old default
  if (!process.env.LUGHAWI_MONTHLY_QUOTA_WORDS && raw === 15_000) return 1_500;
  if (!process.env.LUGHAWI_MONTHLY_QUOTA_WORDS && raw > 5_000) return 1_500;
  return Math.floor(raw);
}

/** @deprecated prefer lughawiMonthlyQuotaWords — kept for APIs that still speak "chars" as units */
export function lughawiMonthlyQuotaChars(): number {
  return lughawiMonthlyQuotaWords();
}

export function countArabicWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
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
  const secret =
    process.env.LUGHAWI_CREDENTIALS_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "LUGHAWI_CREDENTIALS_SECRET or AUTH_SECRET must be set in production (no default encrypt key).",
    );
  }
  return "arabya-lughawi-dev-only-change-me";
}

const PROVIDERS: AiProviderId[] = [
  "google",
  "openrouter",
  "openai",
  "anthropic",
  "groq",
  "ollama",
];

export interface ProjectAiSlot {
  provider: AiProviderId;
  apiKey: string;
  model?: string;
  /** OpenAI-compatible base URL (ollama / local proxy). */
  baseUrl?: string;
  /** Optional owner label (e.g. gmail-3) — never expose secrets. */
  label?: string;
}

interface PoolFile {
  version?: number;
  slots?: Array<{
    provider?: string;
    apiKey?: string;
    key?: string;
    model?: string;
    baseUrl?: string;
    label?: string;
  }>;
}

function splitKeys(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  // Support comma OR newline OR | as separators (many keys from many accounts).
  return raw
    .split(/[\n,|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function poolFilePath(): string {
  return (
    process.env.LUGHAWI_PROJECT_AI_POOL_FILE?.trim() ||
    "/var/lib/arabya/lughawi-ai-pool.json"
  );
}

function loadPoolFile(): ProjectAiSlot[] {
  const path = poolFilePath();
  try {
    if (!existsSync(path)) return [];
    const json = JSON.parse(readFileSync(path, "utf8")) as PoolFile;
    const out: ProjectAiSlot[] = [];
    for (const row of json.slots ?? []) {
      const provider = (row.provider ?? "").trim().toLowerCase();
      const apiKey = (row.apiKey ?? row.key ?? "").trim();
      if (!provider || !apiKey) continue;
      if (!PROVIDERS.includes(provider as AiProviderId)) continue;
      out.push({
        provider: provider as AiProviderId,
        apiKey,
        model: row.model?.trim() || undefined,
        baseUrl: row.baseUrl?.trim() || undefined,
        label: row.label?.trim() || undefined,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Build the project Auto pool from env + optional JSON file.
 *
 * Many keys / many accounts:
 * - LUGHAWI_GOOGLE_API_KEYS=key1,key2,key3
 * - LUGHAWI_OPENAI_API_KEYS=sk-a,sk-b
 * - LUGHAWI_ANTHROPIC_API_KEYS=...
 * - LUGHAWI_OPENROUTER_API_KEYS=...
 * - LUGHAWI_GROQ_API_KEYS=...
 * - LUGHAWI_PROJECT_AI_POOL=google:key1|google:key2|openai:sk-...
 * - LUGHAWI_PROJECT_AI_POOL_FILE=/var/lib/arabya/lughawi-ai-pool.json
 * - Local fallback: LUGHAWI_OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
 */
export function lughawiProjectAiPool(): ProjectAiSlot[] {
  const slots: ProjectAiSlot[] = [];
  const seen = new Set<string>();

  function add(
    provider: string,
    apiKey: string | undefined,
    model?: string,
    baseUrl?: string,
    label?: string,
  ) {
    const p = provider.trim().toLowerCase();
    const key = apiKey?.trim();
    if (!key) return;
    if (!PROVIDERS.includes(p as AiProviderId)) return;
    const id = `${p}:${key.slice(-12)}:${baseUrl ?? ""}`;
    if (seen.has(id)) return;
    seen.add(id);
    slots.push({
      provider: p as AiProviderId,
      apiKey: key,
      model: model?.trim() || undefined,
      baseUrl: baseUrl?.trim() || undefined,
      label: label?.trim() || undefined,
    });
  }

  // 0) Super-admin UI pool (encrypted on disk) — preferred source of truth
  try {
    for (const s of listAdminPoolDecrypted()) {
      add(s.provider, s.apiKey, s.model, s.baseUrl, s.label);
    }
  } catch {
    /* ignore corrupt store */
  }

  // 1) JSON file on Contabo (legacy plaintext pool)
  for (const s of loadPoolFile()) {
    add(s.provider, s.apiKey, s.model, s.baseUrl, s.label);
  }

  // 2) Compact pool string
  const poolRaw = process.env.LUGHAWI_PROJECT_AI_POOL?.trim();
  if (poolRaw) {
    for (const part of poolRaw.split("|")) {
      const [prov, ...rest] = part.split(":");
      const key = rest.join(":").trim();
      if (prov && key) add(prov, key);
    }
  }

  // 3) Multi-key env vars (comma / newline / |)
  for (const k of splitKeys(process.env.LUGHAWI_GOOGLE_API_KEYS)) {
    add("google", k, process.env.LUGHAWI_GOOGLE_MODEL);
  }
  for (const k of splitKeys(process.env.LUGHAWI_OPENAI_API_KEYS)) {
    add("openai", k, process.env.LUGHAWI_OPENAI_MODEL);
  }
  for (const k of splitKeys(process.env.LUGHAWI_ANTHROPIC_API_KEYS)) {
    add("anthropic", k, process.env.LUGHAWI_ANTHROPIC_MODEL);
  }
  for (const k of splitKeys(process.env.LUGHAWI_OPENROUTER_API_KEYS)) {
    add("openrouter", k, process.env.LUGHAWI_OPENROUTER_MODEL);
  }
  for (const k of splitKeys(process.env.LUGHAWI_GROQ_API_KEYS)) {
    add("groq", k, process.env.LUGHAWI_GROQ_MODEL);
  }

  // 4) Single-key legacy vars
  add("google", process.env.LUGHAWI_GOOGLE_API_KEY, process.env.LUGHAWI_GOOGLE_MODEL);
  add("openrouter", process.env.LUGHAWI_OPENROUTER_API_KEY, process.env.LUGHAWI_OPENROUTER_MODEL);
  add("openai", process.env.LUGHAWI_OPENAI_API_KEY, process.env.LUGHAWI_OPENAI_MODEL);
  add("anthropic", process.env.LUGHAWI_ANTHROPIC_API_KEY, process.env.LUGHAWI_ANTHROPIC_MODEL);
  add("groq", process.env.LUGHAWI_GROQ_API_KEY, process.env.LUGHAWI_GROQ_MODEL);
  add(lughawiProjectProvider(), lughawiProjectApiKey());

  // 5) Local Ollama / OpenAI-compatible on Contabo (always-on fallback)
  const ollamaUrl =
    process.env.LUGHAWI_OLLAMA_BASE_URL?.trim() ||
    process.env.LUGHAWI_LOCAL_AI_BASE_URL?.trim();
  if (ollamaUrl) {
    add(
      "ollama",
      process.env.LUGHAWI_OLLAMA_API_KEY?.trim() || "ollama",
      process.env.LUGHAWI_OLLAMA_MODEL?.trim() || "llama3.1:8b",
      ollamaUrl.replace(/\/$/, ""),
      "contabo-local",
    );
  }

  // Prefer free/cloud-fast first; local last as safety net
  const order: Record<string, number> = {
    google: 0,
    openrouter: 1,
    groq: 2,
    openai: 3,
    anthropic: 4,
    ollama: 5,
  };
  slots.sort(
    (a, b) => (order[a.provider] ?? 9) - (order[b.provider] ?? 9),
  );
  return slots;
}

/** Summarize pool for status UI (no secrets). */
export function lughawiProjectAiPoolSummary(): {
  total: number;
  byProvider: Record<string, number>;
  hasLocal: boolean;
} {
  const pool = lughawiProjectAiPool();
  const byProvider: Record<string, number> = {};
  for (const s of pool) {
    byProvider[s.provider] = (byProvider[s.provider] ?? 0) + 1;
  }
  return {
    total: pool.length,
    byProvider,
    hasLocal: pool.some((s) => s.provider === "ollama"),
  };
}
