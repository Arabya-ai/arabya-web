import { readFile } from "node:fs/promises";
import path from "node:path";
import { readAdhkarContentOverride } from "@/lib/adhkar-content-store";

const dataRoot = path.join(process.cwd(), "data", "adhkar");

/** Static tool routes under `/adhkar/*` — must not collide with category slugs. */
export const ADHKAR_TOOL_SLUGS = ["duas", "tasbeeh"] as const;
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

export async function getDuas(): Promise<DuaItem[]> {
  const override = readAdhkarContentOverride();
  if (Array.isArray(override?.duas) && override.duas.length > 0) {
    return override.duas.filter(
      (item) => item.id && item.textAr && item.active !== false,
    );
  }
  const parsed = await readJson<{ items?: DuaItem[] }>("duas.json");
  return (parsed?.items ?? []).filter(
    (item) => item.id && item.textAr && item.active !== false,
  );
}

export async function getTasbeehPhrases(): Promise<TasbeehPhrase[]> {
  const parsed = await readJson<{ phrases?: TasbeehPhrase[] }>("tasbeeh.json");
  return (parsed?.phrases ?? []).filter((p) => p.id && p.textAr);
}
