import { readFile } from "node:fs/promises";
import path from "node:path";
import { readAdhkarContentOverride } from "@/lib/adhkar-content-store";

const dataRoot = path.join(process.cwd(), "data", "adhkar");

/** Static tool routes under `/adhkar/*` — must not collide with category slugs. */
export const ADHKAR_TOOL_SLUGS = ["duas", "tasbeeh", "hisn"] as const;
export type AdhkarToolSlug = (typeof ADHKAR_TOOL_SLUGS)[number];

export function isAdhkarToolSlug(slug: string): slug is AdhkarToolSlug {
  return (ADHKAR_TOOL_SLUGS as readonly string[]).includes(slug);
}

export type AdhkarCategoryMeta = {
  slug: string;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  itemCount?: number;
  targetSum?: number;
};

export type AdhkarItem = {
  id: string;
  textAr: string;
  repeat: number;
  source?: string;
  fadlAr?: string;
  fadlEn?: string;
  active?: boolean;
};

export type AdhkarCategory = AdhkarCategoryMeta & {
  items: AdhkarItem[];
};

export type DuaItem = {
  id: string;
  categoryAr: string;
  categoryEn: string;
  textAr: string;
  source?: string;
  active?: boolean;
};

export type TasbeehPhrase = {
  id: string;
  textAr: string;
};

async function readJson<T>(filename: string): Promise<T | null> {
  try {
    const raw = await readFile(path.join(dataRoot, filename), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function getAdhkarCategories(): Promise<AdhkarCategoryMeta[]> {
  const parsed = await readJson<{ categories?: AdhkarCategoryMeta[] }>(
    "index.json",
  );
  const categories = (parsed?.categories ?? []).filter(
    (c) => c.slug && !isAdhkarToolSlug(c.slug),
  );
  const withCounts = await Promise.all(
    categories.map(async (meta) => {
      const category = await getAdhkarCategory(meta.slug);
      const items = category?.items ?? [];
      const targetSum = items.reduce(
        (n, item) => n + Math.max(1, Number(item.repeat) || 1),
        0,
      );
      return { ...meta, itemCount: items.length, targetSum };
    }),
  );
  return withCounts;
}

export async function getAdhkarCategory(
  slug: string,
): Promise<AdhkarCategory | null> {
  if (isAdhkarToolSlug(slug)) return null;
  const categories = await readJson<{ categories?: AdhkarCategoryMeta[] }>(
    "index.json",
  );
  const meta = (categories?.categories ?? []).find((c) => c.slug === slug);
  if (!meta) return null;
  const override = readAdhkarContentOverride();
  const overrideItems = override?.adhkarBySlug?.[slug];
  const parsed = await readJson<{ items?: AdhkarItem[] }>(`${slug}.json`);
  const sourceItems =
    Array.isArray(overrideItems) && overrideItems.length > 0
      ? overrideItems
      : (parsed?.items ?? []);
  const items = sourceItems.filter(
    (item) =>
      item.id &&
      item.textAr &&
      Number(item.repeat) > 0 &&
      item.active !== false,
  );
  return { ...meta, items };
}

function normalizeDuaItem(item: Partial<DuaItem> & { textAr?: string }): DuaItem | null {
  if (!item.id || !item.textAr || item.active === false) return null;
  const categoryAr = (item.categoryAr || "").trim() || "عام";
  const categoryEn = (item.categoryEn || "").trim() || "General";
  return {
    id: item.id,
    categoryAr,
    categoryEn,
    textAr: item.textAr,
    source: item.source,
    active: item.active,
  };
}

export async function getDuas(): Promise<DuaItem[]> {
  const override = readAdhkarContentOverride();
  if (Array.isArray(override?.duas) && override.duas.length > 0) {
    return override.duas
      .map((item) => normalizeDuaItem(item))
      .filter((item): item is DuaItem => item !== null);
  }
  const parsed = await readJson<{ items?: DuaItem[] }>("duas.json");
  const base = (parsed?.items ?? [])
    .map((item) => normalizeDuaItem(item))
    .filter((item): item is DuaItem => item !== null);
  const hisn = await getHisnAlMuslimItems();
  if (!hisn.length) return base;
  const seen = new Set(base.map((d) => d.textAr.slice(0, 100)));
  const merged = [...base];
  for (const item of hisn) {
    const key = item.textAr.slice(0, 100);
    if (seen.has(key)) continue;
    seen.add(key);
    const normalized = normalizeDuaItem(item);
    if (normalized) merged.push(normalized);
  }
  return merged;
}

export type HisnCategory = {
  categoryAr: string;
  items: DuaItem[];
};

export async function getHisnAlMuslimItems(): Promise<DuaItem[]> {
  const parsed = await readJson<{
    items?: Array<{
      id: string;
      categoryAr: string;
      textAr: string;
      repeat?: number;
      source?: string;
      active?: boolean;
    }>;
  }>("hisn-almuslim-full.json");
  return (parsed?.items ?? [])
    .filter(
      (item) =>
        item.id &&
        item.textAr &&
        item.active !== false &&
        item.categoryAr !== "المقدمة" &&
        item.categoryAr !== "فضل الذكر",
    )
    .map((item) => ({
      id: item.id,
      categoryAr: item.categoryAr,
      categoryEn: "Hisn al-Muslim",
      textAr: item.textAr,
      source: item.source || "حصن المسلم",
      active: item.active,
    }));
}

export async function getHisnCategories(): Promise<HisnCategory[]> {
  const items = await getHisnAlMuslimItems();
  const map = new Map<string, DuaItem[]>();
  for (const item of items) {
    const list = map.get(item.categoryAr) ?? [];
    list.push(item);
    map.set(item.categoryAr, list);
  }
  return [...map.entries()]
    .map(([categoryAr, catItems]) => ({ categoryAr, items: catItems }))
    .sort((a, b) => a.categoryAr.localeCompare(b.categoryAr, "ar"));
}

export async function getTasbeehPhrases(): Promise<TasbeehPhrase[]> {
  const parsed = await readJson<{ phrases?: TasbeehPhrase[] }>("tasbeeh.json");
  return (parsed?.phrases ?? []).filter((p) => p.id && p.textAr);
}
