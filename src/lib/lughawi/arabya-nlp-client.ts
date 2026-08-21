/**
 * Server-only HTTP client for Contabo arabya-nlp FastAPI (:8092).
 * Browser never talks to :8092 — Next.js `/api/lughawi/*` proxies server-side.
 */

export interface ArabyaNlpHealth {
  ok: boolean;
  ms: number;
  detail?: string;
  service?: string;
}

export interface ArabyaNlpEdit {
  id?: string;
  start?: number;
  end?: number;
  type?: string;
  original?: string;
  suggestion?: string;
  rule_id?: string;
  explanation?: string;
  stage?: string;
}

export interface ArabyaNlpProofreadPayload {
  ok: boolean;
  original: string;
  cleaned?: string;
  corrected: string;
  word_count?: number;
  stage1_engine?: string;
  stage2_engine?: string;
  edits: ArabyaNlpEdit[];
  warnings?: string[];
}

function baseUrl(): string {
  return (
    process.env.ARABYA_NLP_URL?.trim().replace(/\/$/, "") ||
    "http://127.0.0.1:8092"
  );
}

/** When unset/true, /api/lughawi/proofread calls arabya-nlp after local rules. */
export function arabyaNlpProofreadEnabled(): boolean {
  const raw = process.env.ARABYA_NLP_PROOFREAD?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off") return false;
  return true;
}

export function arabyaNlpBaseUrl(): string {
  return baseUrl();
}

export async function probeArabyaNlpHealth(
  timeoutMs = 1500,
): Promise<ArabyaNlpHealth> {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl()}/health`, {
      signal: ctrl.signal,
      cache: "no-store",
    });
    const ms = Date.now() - t0;
    if (!res.ok) {
      return { ok: false, ms, detail: `HTTP ${res.status}` };
    }
    const json = (await res.json()) as { ok?: boolean; service?: string };
    return {
      ok: Boolean(json.ok),
      ms,
      service: typeof json.service === "string" ? json.service : undefined,
    };
  } catch (e) {
    return {
      ok: false,
      ms: Date.now() - t0,
      detail: e instanceof Error ? e.message : "unreachable",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST /v1/proofread — hybrid Contabo stack (rules + local Ollama).
 * Returns null on timeout/network/error (caller keeps local/sidecar result).
 */
export async function arabyaNlpProofread(
  text: string,
  opts?: { preserveDiacritics?: boolean; skipLlm?: boolean; timeoutMs?: number },
): Promise<ArabyaNlpProofreadPayload | null> {
  const timeoutMs = opts?.timeoutMs ?? 45_000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = process.env.ARABYA_NLP_API_TOKEN?.trim();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${baseUrl()}/v1/proofread`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        text,
        preserve_diacritics: opts?.preserveDiacritics ?? true,
        skip_llm: Boolean(opts?.skipLlm),
      }),
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as ArabyaNlpProofreadPayload;
    if (!json || typeof json.corrected !== "string") return null;
    return {
      ...json,
      ok: json.ok !== false,
      edits: Array.isArray(json.edits) ? json.edits : [],
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
