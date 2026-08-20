import { readFile } from "node:fs/promises";
import path from "node:path";
import { expandSearchQueryVariants, normalizeArabicSearch } from "@/lib/quran";

const dataRoot = path.join(process.cwd(), "data", "hadith");

export type HadithCollectionMeta = {
  slug: string;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  itemCount?: number;
};

export type HadithItem = {
  id: string;
  number: number;
  arabic: string;
  grade?: string;
  chapterAr?: string;
  chapterEn?: string;
};

export type HadithCollection = HadithCollectionMeta & {
  source?: string;
  license?: string;
  edition?: string;
  sourceUrl?: string;
  items: HadithItem[];
};

export type HadithSearchHit = {
  id: string;
  collection: string;
  number: number;
  arabic: string;
  titleAr: string;
  titleEn: string;
  href: string;
};

type SearchIndexRow = HadithSearchHit & { norm?: string };

let indexCache: HadithCollectionMeta[] | null = null;
const collectionCache = new Map<string, HadithCollection | null>();
let searchIndexCache: SearchIndexRow[] | null = null;

async function readJson<T>(rel: string): Promise<T | null> {
  try {
    const raw = await readFile(path.join(dataRoot, rel), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function listHadithCollections(): Promise<HadithCollectionMeta[]> {
  if (indexCache) return indexCache;
  const index = await readJson<{ collections?: HadithCollectionMeta[] }>(
    "index.json",
  );
  indexCache = index?.collections ?? [];
  return indexCache;
}

export async function getHadithCollection(
  slug: string,
): Promise<HadithCollection | null> {
  const safe = slug.replace(/[^a-z0-9-]/gi, "");
  if (!safe) return null;
  if (collectionCache.has(safe)) return collectionCache.get(safe) ?? null;
  const data = await readJson<HadithCollection>(`collections/${safe}.json`);
  if (!data?.slug || !Array.isArray(data.items)) {
    collectionCache.set(safe, null);
    return null;
  }
  collectionCache.set(safe, data);
  return data;
}

export async function getHadithItem(
  slug: string,
  numberOrId: string,
): Promise<{ collection: HadithCollection; item: HadithItem } | null> {
  const collection = await getHadithCollection(slug);
  if (!collection) return null;
  const num = Number(numberOrId);
  const item =
    collection.items.find((h) => h.id === numberOrId) ??
    (Number.isFinite(num)
      ? collection.items.find((h) => h.number === num)
      : undefined);
  if (!item) return null;
  return { collection, item };
}

/** Slice a collection for paginated UI (1-based page). */
export function paginateHadithItems(
  items: HadithItem[],
  page: number,
  pageSize = 40,
): { page: number; pageSize: number; total: number; totalPages: number; items: HadithItem[] } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(Math.max(1, page), totalPages);
  const start = (p - 1) * pageSize;
  return {
    page: p,
    pageSize,
    total,
    totalPages,
    items: items.slice(start, start + pageSize),
  };
}

async function getSearchIndex(): Promise<SearchIndexRow[]> {
  if (searchIndexCache) return searchIndexCache;
  const parsed = await readJson<{ items?: SearchIndexRow[] }>(
    "search-index.json",
  );
  if (parsed?.items?.length) {
    searchIndexCache = parsed.items.map((row) => ({
      ...row,
      norm: row.norm || normalizeArabicSearch(row.arabic || ""),
    }));
    return searchIndexCache;
  }
  // Fallback: build from collections (slower first load).
  const metas = await listHadithCollections();
  const rows: SearchIndexRow[] = [];
  for (const meta of metas) {
    const full = await getHadithCollection(meta.slug);
    for (const item of full?.items ?? []) {
      rows.push({
        id: item.id,
        collection: meta.slug,
        number: item.number,
        arabic: item.arabic,
        titleAr: meta.titleAr,
        titleEn: meta.titleEn,
        href: `/hadith/${meta.slug}/${item.number}`,
        norm: normalizeArabicSearch(item.arabic),
      });
    }
  }
  searchIndexCache = rows;
  return rows;
}

export async function searchHadith(
  query: string,
  options: { limit?: number; collection?: string } = {},
): Promise<{ hits: HadithSearchHit[]; total: number }> {
  const q = normalizeArabicSearch(query);
  if (q.length < 2) return { hits: [], total: 0 };
  const variants = expandSearchQueryVariants(q);
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const index = await getSearchIndex();
  const hits: HadithSearchHit[] = [];

  for (const row of index) {
    if (options.collection && row.collection !== options.collection) continue;
    const hay = row.norm || normalizeArabicSearch(row.arabic);
    const textMatch = variants.some((v) => hay.includes(v));
    if (
      !textMatch &&
      !row.id.toLowerCase().includes(query.trim().toLowerCase())
    ) {
      continue;
    }
    hits.push({
      id: row.id,
      collection: row.collection,
      number: row.number,
      arabic: row.arabic,
      titleAr: row.titleAr,
      titleEn: row.titleEn,
      href: row.href,
    });
    if (hits.length >= limit * 5) {
      // collect enough for total estimate then stop early for huge matches
      break;
    }
  }

  // Accurate total when under cap; otherwise re-scan count only
  let total = hits.length;
  if (hits.length >= limit * 5) {
    total = 0;
    for (const row of index) {
      if (options.collection && row.collection !== options.collection) continue;
      const hay = row.norm || normalizeArabicSearch(row.arabic);
      if (
        variants.some((v) => hay.includes(v)) ||
        row.id.toLowerCase().includes(query.trim().toLowerCase())
      ) {
        total += 1;
      }
    }
  }

  return { hits: hits.slice(0, limit), total };
}
