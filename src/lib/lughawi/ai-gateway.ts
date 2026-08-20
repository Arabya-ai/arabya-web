import {
  lughawiCredentialsSecret,
  lughawiProjectAiPool,
  type ProjectAiSlot,
} from "@/lib/lughawi/config";
import type { AiProviderId } from "@/lib/lughawi/types";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export interface AiChatParams {
  provider: AiProviderId | string;
  apiKey: string;
  system: string;
  user: string;
  maxTokens?: number;
  model?: string;
  baseUrl?: string;
}

export interface AiChatResult {
  text: string;
  provider: string;
  model?: string;
  attempts?: number;
  source?: "user" | "project";
}

export interface AiCandidate {
  provider: AiProviderId;
  apiKey: string;
  model?: string;
  baseUrl?: string;
  source: "user" | "project";
  label?: string;
}

function isProvider(id: string): id is AiProviderId {
  return ["openai", "anthropic", "google", "groq", "openrouter", "ollama"].includes(
    id,
  );
}

const DEFAULT_MODELS: Record<AiProviderId, string> = {
  openai: "gpt-4o-mini",
  groq: "llama-3.3-70b-versatile",
  openrouter: "openai/gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
  google: "gemini-2.0-flash",
  ollama: "llama3.2",
};

/** Encrypt user API keys at rest (AES-256-GCM). */
export function encryptSecret(plain: string): string {
  const key = createHash("sha256").update(lughawiCredentialsSecret()).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const key = createHash("sha256").update(lughawiCredentialsSecret()).digest();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function last4(key: string): string {
  const t = key.trim();
  return t.slice(-4);
}

async function chatOpenAiCompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI provider error ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

async function chatAnthropic(
  apiKey: string,
  system: string,
  user: string,
  maxTokens: number,
  model: string,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic error ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  return json.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
}

async function chatGoogle(
  apiKey: string,
  system: string,
  user: string,
  maxTokens: number,
  model: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google AI error ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

export async function runAiChat(params: AiChatParams): Promise<AiChatResult> {
  const provider = params.provider.toLowerCase();
  const maxTokens = params.maxTokens ?? 2048;
  if (!isProvider(provider)) {
    throw new Error(`Unsupported provider: ${params.provider}`);
  }
  const model = params.model?.trim() || DEFAULT_MODELS[provider];

  let text = "";
  if (provider === "openai") {
    text = await chatOpenAiCompatible(
      "https://api.openai.com/v1",
      params.apiKey,
      model,
      params.system,
      params.user,
      maxTokens,
    );
  } else if (provider === "groq") {
    text = await chatOpenAiCompatible(
      "https://api.groq.com/openai/v1",
      params.apiKey,
      model,
      params.system,
      params.user,
      maxTokens,
    );
  } else if (provider === "openrouter") {
    text = await chatOpenAiCompatible(
      "https://openrouter.ai/api/v1",
      params.apiKey,
      model,
      params.system,
      params.user,
      maxTokens,
    );
  } else if (provider === "ollama") {
    text = await chatOpenAiCompatible(
      params.baseUrl ||
        process.env.LUGHAWI_OLLAMA_BASE_URL?.trim() ||
        "http://127.0.0.1:11434/v1",
      params.apiKey || "ollama",
      model,
      params.system,
      params.user,
      maxTokens,
    );
  } else if (provider === "anthropic") {
    text = await chatAnthropic(
      params.apiKey,
      params.system,
      params.user,
      maxTokens,
      model,
    );
  } else if (provider === "google") {
    text = await chatGoogle(
      params.apiKey,
      params.system,
      params.user,
      maxTokens,
      model,
    );
  }

  return { text, provider, model };
}

/** @deprecated prefer resolveProjectAiPool / runAiAuto */
export function resolveProjectAi():
  | { provider: string; apiKey: string }
  | undefined {
  const pool = lughawiProjectAiPool();
  const first = pool[0];
  if (!first) return undefined;
  return { provider: first.provider, apiKey: first.apiKey };
}

export function resolveProjectAiPool(): ProjectAiSlot[] {
  return lughawiProjectAiPool();
}

/**
 * Cursor-like Auto: try candidates in order; on failure rotate to next
 * provider/model/key until one succeeds.
 */
export async function runAiAuto(input: {
  system: string;
  user: string;
  maxTokens?: number;
  candidates: AiCandidate[];
}): Promise<AiChatResult> {
  const errors: string[] = [];
  let attempts = 0;
  for (const c of input.candidates) {
    attempts += 1;
    try {
      const result = await runAiChat({
        provider: c.provider,
        apiKey: c.apiKey,
        model: c.model,
        baseUrl: c.baseUrl,
        system: input.system,
        user: input.user,
        maxTokens: input.maxTokens,
      });
      return { ...result, attempts, source: c.source };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${c.provider}: ${msg.slice(0, 120)}`);
    }
  }
  throw new Error(
    errors.length
      ? `Auto exhausted all providers. ${errors.join(" | ")}`
      : "No AI candidates configured",
  );
}

/** Round-robin so 10 Google keys / 10 OpenAI keys share load evenly. */
let projectRotate = 0;

function rotateSlots(slots: ProjectAiSlot[]): ProjectAiSlot[] {
  if (slots.length <= 1) return slots;
  const start = projectRotate++ % slots.length;
  return [...slots.slice(start), ...slots.slice(0, start)];
}

export function buildAutoCandidates(opts: {
  userCandidates?: AiCandidate[];
  preferProvider?: string | null;
  /** When true, only user keys (no project pool). */
  userOnly?: boolean;
}): AiCandidate[] {
  const out: AiCandidate[] = [];
  const prefer = opts.preferProvider?.toLowerCase();

  const user = [...(opts.userCandidates ?? [])];
  if (prefer) {
    user.sort((a, b) =>
      a.provider === prefer ? -1 : b.provider === prefer ? 1 : 0,
    );
  }
  out.push(...user);

  if (!opts.userOnly) {
    const rotated = rotateSlots(lughawiProjectAiPool());
    for (const slot of rotated) {
      out.push({
        provider: slot.provider,
        apiKey: slot.apiKey,
        model: slot.model,
        baseUrl: slot.baseUrl,
        source: "project",
        label: slot.label,
      });
    }
  }

  // Dedupe identical provider+key tail+model+baseUrl
  const seen = new Set<string>();
  return out.filter((c) => {
    const k = `${c.provider}:${c.apiKey.slice(-12)}:${c.model ?? ""}:${c.baseUrl ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
