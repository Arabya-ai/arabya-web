/**
 * Token / request usage meter for Lughawi AI pool.
 * Tracks per-slot estimated tokens so Auto can prefer healthier keys.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface SlotUsage {
  provider: string;
  keyTail: string;
  label?: string;
  /** Estimated prompt+completion tokens this UTC month. */
  tokensMonth: number;
  requestsMonth: number;
  failuresMonth: number;
  /** Soft monthly budget (tokens). When exceeded, slot is deprioritized. */
  budgetTokens: number;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastError?: string;
}

interface UsageFile {
  version: number;
  month: string;
  slots: SlotUsage[];
  updatedAt: string;
}

function usagePath(): string {
  return (
    process.env.LUGHAWI_AI_USAGE_FILE?.trim() ||
    "/var/lib/arabya/lughawi-ai-usage.json"
  );
}

function utcMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function defaultBudget(provider: string): number {
  const map: Record<string, number> = {
    google: 800_000,
    openrouter: 500_000,
    groq: 400_000,
    openai: 300_000,
    anthropic: 200_000,
    ollama: 50_000_000,
  };
  return map[provider] ?? 250_000;
}

function emptyFile(): UsageFile {
  return {
    version: 1,
    month: utcMonth(),
    slots: [],
    updatedAt: new Date().toISOString(),
  };
}

function load(): UsageFile {
  const path = usagePath();
  try {
    if (!existsSync(path)) return emptyFile();
    const raw = JSON.parse(readFileSync(path, "utf8")) as UsageFile;
    if (raw.month !== utcMonth()) {
      return { ...emptyFile(), version: raw.version ?? 1 };
    }
    return raw;
  } catch {
    return emptyFile();
  }
}

function save(file: UsageFile): void {
  const path = usagePath();
  try {
    mkdirSync(dirname(path), { recursive: true });
    file.updatedAt = new Date().toISOString();
    writeFileSync(path, JSON.stringify(file, null, 2), "utf8");
  } catch {
    // Dev / read-only FS — keep in-memory only for this process.
  }
}

function slotId(provider: string, apiKey: string): string {
  return `${provider}:${apiKey.slice(-12)}`;
}

export function estimateTokens(text: string): number {
  // Arabic ~1.5–2 chars/token; keep conservative estimate.
  return Math.max(1, Math.ceil(text.length / 2.2));
}

export function recordAiSuccess(opts: {
  provider: string;
  apiKey: string;
  label?: string;
  promptChars: number;
  completionChars: number;
}): void {
  const file = load();
  const id = slotId(opts.provider, opts.apiKey);
  let row = file.slots.find((s) => `${s.provider}:${s.keyTail}` === id);
  if (!row) {
    row = {
      provider: opts.provider,
      keyTail: opts.apiKey.slice(-12),
      label: opts.label,
      tokensMonth: 0,
      requestsMonth: 0,
      failuresMonth: 0,
      budgetTokens: defaultBudget(opts.provider),
    };
    file.slots.push(row);
  }
  const tokens =
    estimateTokens("x".repeat(opts.promptChars)) +
    estimateTokens("x".repeat(opts.completionChars));
  row.tokensMonth += tokens;
  row.requestsMonth += 1;
  row.lastSuccessAt = new Date().toISOString();
  row.lastError = undefined;
  if (opts.label) row.label = opts.label;
  save(file);
}

export function recordAiFailure(opts: {
  provider: string;
  apiKey: string;
  label?: string;
  error: string;
}): void {
  const file = load();
  const id = slotId(opts.provider, opts.apiKey);
  let row = file.slots.find((s) => `${s.provider}:${s.keyTail}` === id);
  if (!row) {
    row = {
      provider: opts.provider,
      keyTail: opts.apiKey.slice(-12),
      label: opts.label,
      tokensMonth: 0,
      requestsMonth: 0,
      failuresMonth: 0,
      budgetTokens: defaultBudget(opts.provider),
    };
    file.slots.push(row);
  }
  row.failuresMonth += 1;
  row.lastFailureAt = new Date().toISOString();
  row.lastError = opts.error.slice(0, 180);
  if (opts.label) row.label = opts.label;
  save(file);
}

export function remainingRatio(slot: SlotUsage): number {
  if (slot.budgetTokens <= 0) return 1;
  return Math.max(0, 1 - slot.tokensMonth / slot.budgetTokens);
}

/** Higher score = prefer this slot first. */
export function slotHealthScore(opts: {
  provider: string;
  apiKey: string;
}): number {
  const file = load();
  const id = slotId(opts.provider, opts.apiKey);
  const row = file.slots.find((s) => `${s.provider}:${s.keyTail}` === id);
  if (!row) return 1;
  const remaining = remainingRatio(row);
  const failPenalty = Math.min(0.5, row.failuresMonth * 0.05);
  return Math.max(0.01, remaining - failPenalty);
}

export function usageSummary(): {
  month: string;
  slots: Array<{
    provider: string;
    keyTail: string;
    label?: string;
    tokensMonth: number;
    requestsMonth: number;
    failuresMonth: number;
    budgetTokens: number;
    remainingPct: number;
    lastSuccessAt?: string;
    lastFailureAt?: string;
    lastError?: string;
    alert?: "ok" | "low" | "exhausted" | "failing";
  }>;
  alerts: Array<{ level: "warn" | "critical"; messageAr: string }>;
} {
  const file = load();
  const alerts: Array<{ level: "warn" | "critical"; messageAr: string }> = [];
  const slots = file.slots.map((s) => {
    const remainingPct = Math.round(remainingRatio(s) * 100);
    let alert: "ok" | "low" | "exhausted" | "failing" = "ok";
    if (s.failuresMonth >= 5) alert = "failing";
    else if (remainingPct <= 0) alert = "exhausted";
    else if (remainingPct <= 15) alert = "low";

    if (alert === "exhausted") {
      alerts.push({
        level: "critical",
        messageAr: `نفد تقريبًا ميزان التوكن لمفتاح ${s.provider} …${s.keyTail}`,
      });
    } else if (alert === "low") {
      alerts.push({
        level: "warn",
        messageAr: `تبقي ${remainingPct}% من ميزان ${s.provider} …${s.keyTail}`,
      });
    } else if (alert === "failing") {
      alerts.push({
        level: "critical",
        messageAr: `فشل متكرر على ${s.provider} …${s.keyTail}: ${s.lastError ?? ""}`,
      });
    }

    return {
      provider: s.provider,
      keyTail: s.keyTail,
      label: s.label,
      tokensMonth: s.tokensMonth,
      requestsMonth: s.requestsMonth,
      failuresMonth: s.failuresMonth,
      budgetTokens: s.budgetTokens,
      remainingPct,
      lastSuccessAt: s.lastSuccessAt,
      lastFailureAt: s.lastFailureAt,
      lastError: s.lastError,
      alert,
    };
  });

  return { month: file.month, slots, alerts };
}
