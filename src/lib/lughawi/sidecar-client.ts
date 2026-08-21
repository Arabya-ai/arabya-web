/**
 * HTTP client for services/lughawi-sidecar (localhost only — never in browser bundle logic with secrets).
 */

export interface SidecarHealth {
  ok: boolean;
  version?: string;
  tools?: Record<string, string>;
  ms: number;
  detail?: string;
}

export interface SidecarMorphToken {
  surface: string;
  lemma?: string;
  pos?: string;
  note?: string;
}

function baseUrl(): string {
  return (
    process.env.LUGHAWI_SIDECAR_URL?.trim().replace(/\/$/, "") ||
    "http://127.0.0.1:8091"
  );
}

export async function probeSidecarHealth(
  timeoutMs = 1200,
): Promise<SidecarHealth> {
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
    const json = (await res.json()) as {
      ok?: boolean;
      version?: string;
      tools?: Record<string, string>;
    };
    return {
      ok: Boolean(json.ok),
      version: json.version,
      tools: json.tools,
      ms,
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

export async function sidecarTashkeel(
  text: string,
  level: string,
  timeoutMs = 8000,
): Promise<{ text: string; engine: string } | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl()}/tashkeel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, level }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      ok?: boolean;
      text?: string;
      engine?: string;
    };
    if (!json.ok || typeof json.text !== "string") return null;
    return { text: json.text, engine: json.engine ?? "sidecar-tashkeel" };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function sidecarMorph(
  text: string,
  timeoutMs = 6000,
): Promise<{ tokens: SidecarMorphToken[]; engine: string } | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl()}/morph`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      ok?: boolean;
      tokens?: SidecarMorphToken[];
      engine?: string;
    };
    if (!json.ok || !Array.isArray(json.tokens)) return null;
    return {
      tokens: json.tokens,
      engine: json.engine ?? "sidecar-morph",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface SidecarGecEdit {
  id?: string;
  start?: number;
  end?: number;
  type?: string;
  original?: string;
  suggestion?: string;
  ruleId?: string;
  explanation?: string;
  confidence?: number;
  source?: string;
  status?: string;
}

/** Rule-based NLP + optional neural GEC from Contabo sidecar. */
export async function sidecarGec(
  text: string,
  timeoutMs = 12_000,
): Promise<{ edits: SidecarGecEdit[]; engine: string; warning?: string } | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl()}/gec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      ok?: boolean;
      edits?: SidecarGecEdit[];
      engine?: string;
      warning?: string;
    };
    if (!json.ok) return null;
    return {
      edits: Array.isArray(json.edits) ? json.edits : [],
      engine: json.engine ?? "sidecar-gec",
      warning: typeof json.warning === "string" ? json.warning : undefined,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Whisper STT via sidecar → Hugging Face Inference (when token configured). */
export async function sidecarTranscribe(
  audioBase64: string,
  filename: string,
  timeoutMs = 120_000,
): Promise<{ ok: boolean; text: string; engine: string; error?: string } | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl()}/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64, filename }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      ok?: boolean;
      text?: string;
      engine?: string;
      error?: string;
    };
    return {
      ok: Boolean(json.ok),
      text: typeof json.text === "string" ? json.text : "",
      engine: json.engine ?? "whisper",
      error: typeof json.error === "string" ? json.error : undefined,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
