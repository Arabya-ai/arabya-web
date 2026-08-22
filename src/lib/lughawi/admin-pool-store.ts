/**
 * Admin-managed encrypted project AI key pool.
 * Super-admins add/remove keys from the UI — no .env editing required.
 */

import {
  decryptSecret,
  encryptSecret,
  last4,
} from "@/lib/lughawi/ai-gateway";
import type { AiProviderId } from "@/lib/lughawi/types";
import {
  clearAiUsageByLast4,
  clearAiUsageForApiKey,
} from "@/lib/ops/usage-meter";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const PROVIDERS: AiProviderId[] = [
  "google",
  "openrouter",
  "openai",
  "anthropic",
  "groq",
  "huggingface",
  "ollama",
];

export interface AdminPoolSlot {
  id: string;
  provider: AiProviderId;
  /** AES-GCM ciphertext — never return to browser. */
  keyCiphertext: string;
  keyLast4: string;
  label: string;
  model?: string;
  baseUrl?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

interface AdminPoolFile {
  version: number;
  slots: AdminPoolSlot[];
}

function poolPath(): string {
  return (
    process.env.LUGHAWI_ADMIN_POOL_FILE?.trim() ||
    "/var/lib/arabya/lughawi-admin-pool.json"
  );
}

function empty(): AdminPoolFile {
  return { version: 1, slots: [] };
}

function save(file: AdminPoolFile): void {
  const primary = poolPath();
  const fallback = `${process.cwd()}/.data/lughawi-admin-pool.json`;
  const targets = primary === fallback ? [primary] : [primary, fallback];
  let lastErr: unknown;
  for (const path of targets) {
    try {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify(file, null, 2), "utf8");
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("تعذّر حفظ مجمّع المفاتيح على السيرفر");
}

function load(): AdminPoolFile {
  const primary = poolPath();
  const fallback = `${process.cwd()}/.data/lughawi-admin-pool.json`;
  for (const path of [primary, fallback]) {
    try {
      if (!existsSync(path)) continue;
      const raw = JSON.parse(readFileSync(path, "utf8")) as AdminPoolFile;
      if (!Array.isArray(raw.slots)) continue;
      return { version: raw.version ?? 1, slots: raw.slots };
    } catch {
      /* try next */
    }
  }
  return empty();
}

function newId(): string {
  return `slot_${randomBytes(8).toString("hex")}`;
}

export function isAiProvider(id: string): id is AiProviderId {
  return PROVIDERS.includes(id as AiProviderId);
}

/** Decrypted slots for Auto gateway (server-only). */
export function listAdminPoolDecrypted(): Array<{
  id: string;
  provider: AiProviderId;
  apiKey: string;
  label: string;
  model?: string;
  baseUrl?: string;
}> {
  const file = load();
  const out: Array<{
    id: string;
    provider: AiProviderId;
    apiKey: string;
    label: string;
    model?: string;
    baseUrl?: string;
  }> = [];
  for (const s of file.slots) {
    if (!s.enabled) continue;
    try {
      out.push({
        id: s.id,
        provider: s.provider,
        apiKey: decryptSecret(s.keyCiphertext),
        label: s.label,
        model: s.model,
        baseUrl: s.baseUrl,
      });
    } catch {
      /* skip corrupt */
    }
  }
  return out;
}

export function listAdminPoolPublic(): Array<{
  id: string;
  provider: AiProviderId;
  keyLast4: string;
  label: string;
  model?: string;
  baseUrl?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}> {
  return load().slots.map((s) => ({
    id: s.id,
    provider: s.provider,
    keyLast4: s.keyLast4,
    label: s.label,
    model: s.model,
    baseUrl: s.baseUrl,
    enabled: s.enabled,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    createdBy: s.createdBy,
  }));
}

export function addAdminPoolKey(input: {
  provider: string;
  apiKey: string;
  label?: string;
  model?: string;
  baseUrl?: string;
  createdBy?: string;
}): { id: string; keyLast4: string } {
  const provider = input.provider.trim().toLowerCase();
  if (!isAiProvider(provider)) throw new Error("مزود غير مدعوم");
  const apiKey = input.apiKey.trim();
  if (apiKey.length < 8) throw new Error("المفتاح قصير جدًا");

  const file = load();
  // Dedupe by last12
  const tail = apiKey.slice(-12);
  const dup = file.slots.find(
    (s) => s.provider === provider && decryptSafeTail(s) === tail,
  );
  if (dup) {
    throw new Error("هذا المفتاح مضاف مسبقًا");
  }

  const now = new Date().toISOString();
  const slot: AdminPoolSlot = {
    id: newId(),
    provider,
    keyCiphertext: encryptSecret(apiKey),
    keyLast4: last4(apiKey),
    label: (input.label?.trim() || `${provider}-${last4(apiKey)}`).slice(0, 80),
    model: input.model?.trim() || undefined,
    baseUrl: input.baseUrl?.trim() || undefined,
    enabled: true,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
  };
  file.slots.push(slot);
  save(file);
  return { id: slot.id, keyLast4: slot.keyLast4 };
}

function decryptSafeTail(s: AdminPoolSlot): string {
  try {
    return decryptSecret(s.keyCiphertext).slice(-12);
  } catch {
    return "";
  }
}

/** Paste many lines: `provider:key` or `provider|key|label` or raw keys with default provider. */
export function bulkAddAdminPoolKeys(input: {
  text: string;
  defaultProvider?: string;
  createdBy?: string;
}): { added: number; skipped: number; errors: string[] } {
  const lines = input.text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  let added = 0;
  let skipped = 0;
  const errors: string[] = [];
  const defaultProvider = (input.defaultProvider ?? "google").toLowerCase();

  for (const line of lines) {
    let provider = defaultProvider;
    let apiKey = line;
    let label: string | undefined;

    if (line.includes("|")) {
      const [p, k, lab] = line.split("|").map((x) => x.trim());
      if (p && k) {
        provider = p.toLowerCase();
        apiKey = k;
        label = lab;
      }
    } else if (line.includes(":")) {
      // google:AIza...  or openai:sk-...
      const idx = line.indexOf(":");
      const maybeProv = line.slice(0, idx).trim().toLowerCase();
      const rest = line.slice(idx + 1).trim();
      if (isAiProvider(maybeProv) && rest.length >= 8) {
        provider = maybeProv;
        apiKey = rest;
      }
    }

    try {
      addAdminPoolKey({
        provider,
        apiKey,
        label,
        createdBy: input.createdBy,
      });
      added += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("مضاف")) skipped += 1;
      else errors.push(`${apiKey.slice(0, 8)}…: ${msg}`);
    }
  }
  return { added, skipped, errors };
}

export function updateAdminPoolKey(
  id: string,
  patch: {
    label?: string;
    model?: string;
    baseUrl?: string;
    enabled?: boolean;
    apiKey?: string;
  },
): boolean {
  const file = load();
  const slot = file.slots.find((s) => s.id === id);
  if (!slot) return false;
  if (patch.label !== undefined) slot.label = patch.label.trim().slice(0, 80);
  if (patch.model !== undefined) slot.model = patch.model.trim() || undefined;
  if (patch.baseUrl !== undefined) slot.baseUrl = patch.baseUrl.trim() || undefined;
  if (patch.enabled !== undefined) slot.enabled = patch.enabled;
  if (patch.apiKey?.trim()) {
    const k = patch.apiKey.trim();
    if (k.length < 8) throw new Error("المفتاح قصير جدًا");
    slot.keyCiphertext = encryptSecret(k);
    slot.keyLast4 = last4(k);
  }
  slot.updatedAt = new Date().toISOString();
  save(file);
  return true;
}

export function deleteAdminPoolKey(id: string): boolean {
  const file = load();
  const slot = file.slots.find((s) => s.id === id);
  if (!slot) return false;
  try {
    const plain = decryptSecret(slot.keyCiphertext);
    clearAiUsageForApiKey(slot.provider, plain);
  } catch {
    clearAiUsageByLast4(slot.provider, slot.keyLast4);
  }
  file.slots = file.slots.filter((s) => s.id !== id);
  save(file);
  return true;
}

export function adminPoolSummary(): {
  total: number;
  enabled: number;
  byProvider: Record<string, number>;
} {
  const slots = load().slots;
  const byProvider: Record<string, number> = {};
  let enabled = 0;
  for (const s of slots) {
    byProvider[s.provider] = (byProvider[s.provider] ?? 0) + 1;
    if (s.enabled) enabled += 1;
  }
  return { total: slots.length, enabled, byProvider };
}
