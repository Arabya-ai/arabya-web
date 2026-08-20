import {
  lughawiCredentialsSecret,
  lughawiProjectApiKey,
  lughawiProjectProvider,
} from "@/lib/lughawi/config";
import type { AiProviderId } from "@/lib/lughawi/types";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export interface AiChatParams {
  provider: AiProviderId | string;
  apiKey: string;
  system: string;
  user: string;
  maxTokens?: number;
}

export interface AiChatResult {
  text: string;
  provider: string;
}

function isProvider(id: string): id is AiProviderId {
  return ["openai", "anthropic", "google", "groq", "openrouter"].includes(id);
}

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
  const res = await fetch(`${baseUrl}/chat/completions`, {
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
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
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
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
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

  let text = "";
  if (provider === "openai") {
    text = await chatOpenAiCompatible(
      "https://api.openai.com/v1",
      params.apiKey,
      "gpt-4o-mini",
      params.system,
      params.user,
      maxTokens,
    );
  } else if (provider === "groq") {
    text = await chatOpenAiCompatible(
      "https://api.groq.com/openai/v1",
      params.apiKey,
      "llama-3.3-70b-versatile",
      params.system,
      params.user,
      maxTokens,
    );
  } else if (provider === "openrouter") {
    text = await chatOpenAiCompatible(
      "https://openrouter.ai/api/v1",
      params.apiKey,
      "openai/gpt-4o-mini",
      params.system,
      params.user,
      maxTokens,
    );
  } else if (provider === "anthropic") {
    text = await chatAnthropic(params.apiKey, params.system, params.user, maxTokens);
  } else if (provider === "google") {
    text = await chatGoogle(params.apiKey, params.system, params.user, maxTokens);
  }

  return { text, provider };
}

export function resolveProjectAi():
  | { provider: string; apiKey: string }
  | undefined {
  const apiKey = lughawiProjectApiKey();
  if (!apiKey) return undefined;
  return { provider: lughawiProjectProvider(), apiKey };
}
