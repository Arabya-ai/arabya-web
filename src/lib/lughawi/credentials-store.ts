import {
  decryptSecret,
  encryptSecret,
  last4,
} from "@/lib/lughawi/ai-gateway";
import type { AiProviderId } from "@/lib/lughawi/types";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

interface CredRow {
  userId: string;
  provider: AiProviderId;
  keyCiphertext: string;
  keyLast4: string;
  isDefault: boolean;
  updatedAt: string;
}

interface CredFile {
  rows: CredRow[];
}

function storePath(): string {
  return (
    process.env.LUGHAWI_CREDENTIALS_PATH?.trim() ||
    join(process.cwd(), ".data", "lughawi-credentials.json")
  );
}

function load(): CredFile {
  try {
    const raw = readFileSync(storePath(), "utf8");
    const parsed = JSON.parse(raw) as CredFile;
    if (!Array.isArray(parsed.rows)) return { rows: [] };
    return parsed;
  } catch {
    return { rows: [] };
  }
}

function save(file: CredFile) {
  const path = storePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(file, null, 2), "utf8");
}

export function listProviderStatus(userId: string): {
  id: AiProviderId;
  configured: boolean;
  last4?: string;
  isDefault: boolean;
}[] {
  const file = load();
  const ids: AiProviderId[] = [
    "openai",
    "anthropic",
    "google",
    "groq",
    "openrouter",
  ];
  return ids.map((id) => {
    const row = file.rows.find((r) => r.userId === userId && r.provider === id);
    return {
      id,
      configured: Boolean(row),
      last4: row?.keyLast4,
      isDefault: row?.isDefault ?? false,
    };
  });
}

export function saveUserKey(
  userId: string,
  provider: AiProviderId,
  apiKey: string,
  makeDefault = true,
): { last4: string } {
  const file = load();
  const trimmed = apiKey.trim();
  if (trimmed.length < 8) throw new Error("API key too short");
  const ciphertext = encryptSecret(trimmed);
  const l4 = last4(trimmed);
  if (makeDefault) {
    for (const r of file.rows) {
      if (r.userId === userId) r.isDefault = false;
    }
  }
  const existing = file.rows.find(
    (r) => r.userId === userId && r.provider === provider,
  );
  if (existing) {
    existing.keyCiphertext = ciphertext;
    existing.keyLast4 = l4;
    existing.isDefault = makeDefault;
    existing.updatedAt = new Date().toISOString();
  } else {
    file.rows.push({
      userId,
      provider,
      keyCiphertext: ciphertext,
      keyLast4: l4,
      isDefault: makeDefault,
      updatedAt: new Date().toISOString(),
    });
  }
  save(file);
  return { last4: l4 };
}

export function deleteUserKey(userId: string, provider: AiProviderId): boolean {
  const file = load();
  const before = file.rows.length;
  file.rows = file.rows.filter(
    (r) => !(r.userId === userId && r.provider === provider),
  );
  if (file.rows.length === before) return false;
  save(file);
  return true;
}

export function getUserApiKey(
  userId: string,
  provider?: string,
): { provider: AiProviderId; apiKey: string } | undefined {
  const file = load();
  const mine = file.rows.filter((r) => r.userId === userId);
  if (!mine.length) return undefined;
  const row = provider
    ? mine.find((r) => r.provider === provider)
    : mine.find((r) => r.isDefault) ?? mine[0];
  if (!row) return undefined;
  return { provider: row.provider, apiKey: decryptSecret(row.keyCiphertext) };
}
