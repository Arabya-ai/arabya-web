/** Shared sanitizers for adhkar/tasbeeh sync payloads (client + server). */

const ADHKAR_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const TASBEEH_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const MAX_ADHKAR_KEYS = 800;
const MAX_COUNT = 1_000_000;

const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function sanitizeAdhkarMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  let n = 0;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (BLOCKED_KEYS.has(key) || !ADHKAR_ID_RE.test(key)) continue;
    const num = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(num) || num < 0) continue;
    out[key] = Math.min(MAX_COUNT, Math.floor(num));
    n += 1;
    if (n >= MAX_ADHKAR_KEYS) break;
  }
  return out;
}

export function sanitizeTasbeehState(raw: unknown): {
  phraseId: string;
  count: number;
} {
  const fallback = { phraseId: "subhanallah", count: 0 };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fallback;
  const obj = raw as { phraseId?: unknown; count?: unknown };
  const phraseId =
    typeof obj.phraseId === "string" && TASBEEH_ID_RE.test(obj.phraseId)
      ? obj.phraseId
      : fallback.phraseId;
  const num =
    typeof obj.count === "number" ? obj.count : Number(obj.count);
  const count =
    Number.isFinite(num) && num >= 0
      ? Math.min(MAX_COUNT, Math.floor(num))
      : 0;
  return { phraseId, count };
}
