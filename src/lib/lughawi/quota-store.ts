import { lughawiMonthlyQuotaChars } from "@/lib/lughawi/config";
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
} {
  const period = periodNow();
  const limit = lughawiMonthlyQuotaChars();
  const file = load();
  const row = file.rows.find((r) => r.userId === userId && r.period === period);
  const used = row?.usedChars ?? 0;
  return {
    period,
    limitChars: row?.limitChars ?? limit,
    usedChars: used,
    remainingChars: Math.max(0, (row?.limitChars ?? limit) - used),
  };
}

/** Charge chars; returns false if insufficient. */
export function tryChargeQuota(userId: string, chars: number): boolean {
  if (chars <= 0) return true;
  const period = periodNow();
  const limit = lughawiMonthlyQuotaChars();
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
  if (row.usedChars + chars > row.limitChars) return false;
  row.usedChars += chars;
  row.updatedAt = new Date().toISOString();
  save(file);
  return true;
}
