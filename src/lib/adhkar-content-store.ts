import { getUserDb } from "@/lib/local-user-db";
import type { AdhkarItem, DuaItem } from "@/lib/adhkar";

const ADHKAR_CONTENT_KEY = "adhkar_content_override_v1";

type AdhkarContentOverride = {
  adhkarBySlug: Record<string, AdhkarItem[]>;
  duas: DuaItem[];
  updatedAt: number;
  updatedBy: string;
};

function cleanAdhkarItem(item: AdhkarItem): AdhkarItem {
  return {
    id: String(item.id || "").trim(),
    textAr: String(item.textAr || "").trim(),
    repeat: Math.max(1, Number(item.repeat) || 1),
    source: item.source ? String(item.source).trim().slice(0, 240) : undefined,
    fadlAr: item.fadlAr ? String(item.fadlAr).trim().slice(0, 1200) : undefined,
    fadlEn: item.fadlEn ? String(item.fadlEn).trim().slice(0, 1200) : undefined,
    active: item.active !== false,
  };
}

function cleanDuaItem(item: DuaItem): DuaItem {
  return {
    id: String(item.id || "").trim(),
    categoryAr: String(item.categoryAr || "").trim(),
    categoryEn: String(item.categoryEn || "").trim(),
    textAr: String(item.textAr || "").trim(),
    source: item.source ? String(item.source).trim().slice(0, 240) : undefined,
    active: item.active !== false,
  };
}

export function readAdhkarContentOverride(): AdhkarContentOverride | null {
  const db = getUserDb();
  try {
    const row = db
      .prepare(`SELECT value FROM site_settings WHERE key = ? LIMIT 1`)
      .get(ADHKAR_CONTENT_KEY) as { value?: string } | undefined;
    if (!row?.value) return null;
    const parsed = JSON.parse(row.value) as Partial<AdhkarContentOverride>;
    const adhkarBySlug: Record<string, AdhkarItem[]> = {};
    for (const [slug, items] of Object.entries(parsed.adhkarBySlug || {})) {
      const cleaned = Array.isArray(items)
        ? items.map(cleanAdhkarItem).filter((i) => i.id && i.textAr && i.repeat > 0)
        : [];
      adhkarBySlug[slug] = cleaned;
    }
    const duas = Array.isArray(parsed.duas)
      ? parsed.duas
          .map(cleanDuaItem)
          .filter((d) => d.id && d.textAr && d.categoryAr)
      : [];
    return {
      adhkarBySlug,
      duas,
      updatedAt: Number(parsed.updatedAt) || 0,
      updatedBy: String(parsed.updatedBy || ""),
    };
  } catch {
    return null;
  }
}

export function writeAdhkarContentOverride(
  actorEmail: string,
  input: { adhkarBySlug: Record<string, AdhkarItem[]>; duas: DuaItem[] },
): AdhkarContentOverride {
  const db = getUserDb();
  const updatedAt = Date.now();
  const payload: AdhkarContentOverride = {
    adhkarBySlug: Object.fromEntries(
      Object.entries(input.adhkarBySlug).map(([slug, items]) => [
        slug,
        items
          .map(cleanAdhkarItem)
          .filter((item) => item.id && item.textAr && item.repeat > 0),
      ]),
    ),
    duas: input.duas
      .map(cleanDuaItem)
      .filter((item) => item.id && item.textAr && item.categoryAr),
    updatedAt,
    updatedBy: actorEmail.trim().toLowerCase(),
  };
  db.prepare(
    `INSERT INTO site_settings (key, value, updated_at, updated_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by`,
  ).run(ADHKAR_CONTENT_KEY, JSON.stringify(payload), updatedAt, payload.updatedBy);
  return payload;
}
