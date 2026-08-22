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

/** Clear failure counters after key rotation / delete (stops sticky red alerts). */
export function clearAiUsageForApiKey(provider: string, apiKey: string): boolean {
  const file = load();
  const id = slotId(provider, apiKey);
  const row = file.slots.find((s) => `${s.provider}:${s.keyTail}` === id);
  if (!row) return false;
  row.failuresMonth = 0;
  row.lastError = undefined;
  row.lastFailureAt = undefined;
  save(file);
  return true;
}

/** Match by provider + last-4 (admin UI public id) when full key unknown. */
export function clearAiUsageByLast4(provider: string, keyLast4: string): number {
  const file = load();
  const needle = keyLast4.trim().toLowerCase();
  if (needle.length < 4) return 0;
  let n = 0;
  for (const row of file.slots) {
    if (row.provider !== provider) continue;
    if (!row.keyTail.toLowerCase().endsWith(needle)) continue;
    row.failuresMonth = 0;
    row.lastError = undefined;
    row.lastFailureAt = undefined;
    n += 1;
  }
  if (n > 0) save(file);
  return n;
}

/** Drop failure alerts for keys no longer in the active pool (by last-4). */
export function pruneFailureAlertsForActiveLast4(
  active: Array<{ provider: string; keyLast4: string }>,
): void {
  const file = load();
  const alive = new Set(
    active.map((a) => `${a.provider}:${a.keyLast4.toLowerCase()}`),
  );
  let changed = false;
  for (const row of file.slots) {
    if (row.failuresMonth < 5) continue;
    const key = `${row.provider}:${row.keyTail.slice(-4).toLowerCase()}`;
    if (alive.has(key)) continue;
    row.failuresMonth = 0;
    row.lastError = undefined;
    changed = true;
  }
  if (changed) save(file);
}

export function remainingRatio(slot: SlotUsage): number {
  if (slot.budgetTokens <= 0) return 1;
  return Math.max(0, 1 - slot.tokensMonth / slot.budgetTokens);
}

/** Transient provider capacity errors should not sticky-red the ops board. */
export function isTransientAiError(err?: string): boolean {
  return /503|UNAVAILABLE|high demand|try again later|temporar|overloaded/i.test(
    err ?? "",
  );
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

export function usageSummary(opts?: {
  /** Only raise "failing" alerts for these last-4 keys (enabled pool). */
  activeLast4?: Array<{ provider: string; keyLast4: string }>;
}): {
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
  const alive =
    opts?.activeLast4 && opts.activeLast4.length > 0
      ? new Set(
          opts.activeLast4.map(
            (a) => `${a.provider}:${a.keyLast4.toLowerCase()}`,
          ),
        )
      : null;

  const alerts: Array<{ level: "warn" | "critical"; messageAr: string }> = [];
  const slots = file.slots.map((s) => {
    const remainingPct = Math.round(remainingRatio(s) * 100);
    let alert: "ok" | "low" | "exhausted" | "failing" = "ok";
    const stillActive =
      !alive || alive.has(`${s.provider}:${s.keyTail.slice(-4).toLowerCase()}`);
    if (s.failuresMonth >= 5 && stillActive) {
      // Capacity spikes (503) are common on free Google tiers — escalate slowly.
      if (isTransientAiError(s.lastError)) {
        alert = s.failuresMonth >= 20 ? "failing" : "low";
      } else {
        alert = "failing";
      }
    } else if (remainingPct <= 0 && stillActive) alert = "exhausted";
    else if (remainingPct <= 15 && stillActive) alert = "low";

    if (alert === "exhausted") {
      alerts.push({
        level: "critical",
        messageAr: `نفد تقريبًا ميزان التوكن لمفتاح ${s.provider} …${s.keyTail}`,
      });
    } else if (alert === "low" && isTransientAiError(s.lastError)) {
      alerts.push({
        level: "warn",
        messageAr: `ضغط مؤقت (503) على ${s.provider} …${s.keyTail} — التدوير يعمل؛ التدقيق المحلي سليم`,
      });
    } else if (alert === "low") {
      alerts.push({
        level: "warn",
        messageAr: `تبقي ${remainingPct}% من ميزان ${s.provider} …${s.keyTail}`,
      });
    } else if (alert === "failing") {
      alerts.push({
        level: "critical",
        messageAr: `فشل متكرر على ${s.provider} …${s.keyTail}: ${s.lastError ?? "بدون تفاصيل — راجع سجل الاستخدام"}`,
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
