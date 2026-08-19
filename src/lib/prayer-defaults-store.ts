import { getUserDb } from "@/lib/local-user-db";

const PRAYER_DEFAULTS_KEY = "prayer_defaults_v1";

export type PrayerDefaults = {
  method: number;
  school: 0 | 1;
  updatedAt?: number | null;
  updatedBy?: string | null;
};

export const DEFAULT_PRAYER_DEFAULTS: PrayerDefaults = {
  method: 5,
  school: 0,
  updatedAt: null,
  updatedBy: null,
};

function sanitizeMethod(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_PRAYER_DEFAULTS.method;
  const rounded = Math.round(n);
  if (rounded < 0 || rounded > 25) return DEFAULT_PRAYER_DEFAULTS.method;
  return rounded;
}

function sanitizeSchool(raw: unknown): 0 | 1 {
  return Number(raw) === 1 ? 1 : 0;
}

export function readPrayerDefaults(): PrayerDefaults {
  const db = getUserDb();
  try {
    const row = db
      .prepare(
        `SELECT value, updated_at as updatedAt, updated_by as updatedBy
         FROM site_settings WHERE key = ? LIMIT 1`,
      )
      .get(PRAYER_DEFAULTS_KEY) as
      | { value?: string; updatedAt?: number | null; updatedBy?: string | null }
      | undefined;
    if (!row?.value) return { ...DEFAULT_PRAYER_DEFAULTS };
    const parsed = JSON.parse(row.value) as Partial<PrayerDefaults>;
    return {
      method: sanitizeMethod(parsed.method),
      school: sanitizeSchool(parsed.school),
      updatedAt: row.updatedAt ?? null,
      updatedBy: row.updatedBy ?? null,
    };
  } catch {
    return { ...DEFAULT_PRAYER_DEFAULTS };
  }
}

export function writePrayerDefaults(
  actorEmail: string,
  input: { method: number; school: number },
): PrayerDefaults {
  const db = getUserDb();
  const now = Date.now();
  const payload: PrayerDefaults = {
    method: sanitizeMethod(input.method),
    school: sanitizeSchool(input.school),
    updatedAt: now,
    updatedBy: actorEmail.trim().toLowerCase(),
  };
  db.prepare(
    `INSERT INTO site_settings (key, value, updated_at, updated_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by`,
  ).run(PRAYER_DEFAULTS_KEY, JSON.stringify(payload), now, payload.updatedBy);
  return payload;
}
