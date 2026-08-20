/**
 * Quota store — free tier counted in **words** (default 1500/month on project keys).
 * Field names keep `*Chars` for API compatibility but units are words.
 */

import { lughawiMonthlyQuotaWords } from "@/lib/lughawi/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

interface QuotaRow {
  userId: string;
  period: string;
  limitChars: number;
  usedChars: number;
  updatedAt: string;
}

interface QuotaFile {
  rows: QuotaRow[];
}

function periodNow(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function storePath(): string {
  return (
    process.env.LUGHAWI_QUOTA_PATH?.trim() ||
    join(process.cwd(), ".data", "lughawi-quota.json")
  );
}

function load(): QuotaFile {
  try {
    const raw = readFileSync(storePath(), "utf8");
    const parsed = JSON.parse(raw) as QuotaFile;
    if (!Array.isArray(parsed.rows)) return { rows: [] };
    return parsed;
  } catch {
    return { rows: [] };
  }
}

function save(file: QuotaFile) {
  const path = storePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(file, null, 2), "utf8");
}

export function getQuota(userId: string): {
  period: string;
  limitChars: number;
  usedChars: number;
  remainingChars: number;
  /** Same numbers — words unit (preferred for UI). */
  limitWords: number;
  usedWords: number;
  remainingWords: number;
  unit: "words";
} {
  const period = periodNow();
  const limit = lughawiMonthlyQuotaWords();
  const file = load();
  const row = file.rows.find((r) => r.userId === userId && r.period === period);
  const used = row?.usedChars ?? 0;
  const limitWords = row?.limitChars ?? limit;
  const remaining = Math.max(0, limitWords - used);
  return {
    period,
    limitChars: limitWords,
    usedChars: used,
    remainingChars: remaining,
    limitWords,
    usedWords: used,
    remainingWords: remaining,
    unit: "words",
  };
}

/** Charge word units; returns false if insufficient. */
export function tryChargeQuota(userId: string, words: number): boolean {
  if (words <= 0) return true;
  const period = periodNow();
  const limit = lughawiMonthlyQuotaWords();
  const file = load();
  let row = file.rows.find((r) => r.userId === userId && r.period === period);
  if (!row) {
    row = {
      userId,
      period,
      limitChars: limit,
      usedChars: 0,
      updatedAt: new Date().toISOString(),
    };
    file.rows.push(row);
  }
  if (row.usedChars + words > row.limitChars) return false;
  row.usedChars += words;
  row.updatedAt = new Date().toISOString();
  save(file);
  return true;
}

/** Top consumers this period (for admin reports). */
export function quotaLeaderboard(limit = 50): Array<{
  userId: string;
  period: string;
  usedWords: number;
  limitWords: number;
}> {
  const period = periodNow();
  const file = load();
  return file.rows
    .filter((r) => r.period === period)
    .map((r) => ({
      userId: r.userId,
      period: r.period,
      usedWords: r.usedChars,
      limitWords: r.limitChars,
    }))
    .sort((a, b) => b.usedWords - a.usedWords)
    .slice(0, limit);
}
