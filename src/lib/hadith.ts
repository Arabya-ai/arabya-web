import { readFile } from "node:fs/promises";
import path from "node:path";
import { normalizeArabicSearch } from "@/lib/quran";

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

async function readJson<T>(rel: string): Promise<T | null> {
  try {
    const raw = await readFile(path.join(dataRoot, rel), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function listHadithCollections(): Promise<HadithCollectionMeta[]> {
  const index = await readJson<{ collections?: HadithCollectionMeta[] }>(
    "index.json",
  );
  const list = index?.collections ?? [];
  return Promise.all(
    list.map(async (meta) => {
      const full = await getHadithCollection(meta.slug);
      return {
        ...meta,
        itemCount: full?.items.length ?? meta.itemCount ?? 0,
      };
    }),
  );
}

export async function getHadithCollection(
  slug: string,
): Promise<HadithCollection | null> {
  const safe = slug.replace(/[^a-z0-9-]/gi, "");
  if (!safe) return null;
  const data = await readJson<HadithCollection>(`collections/${safe}.json`);
  if (!data?.slug || !Array.isArray(data.items)) return null;
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

export async function searchHadith(
  query: string,
  options: { limit?: number; collection?: string } = {},
): Promise<{ hits: HadithSearchHit[]; total: number }> {
  const q = normalizeArabicSearch(query);
  if (q.length < 2) return { hits: [], total: 0 };
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const metas = await listHadithCollections();
  const hits: HadithSearchHit[] = [];

  for (const meta of metas) {
    if (options.collection && meta.slug !== options.collection) continue;
    const full = await getHadithCollection(meta.slug);
    if (!full) continue;
    for (const item of full.items) {
      const hay = normalizeArabicSearch(
        `${item.arabic} ${item.chapterAr ?? ""} ${item.id}`,
      );
      if (!hay.includes(q) && !item.id.toLowerCase().includes(query.trim().toLowerCase())) {
        continue;
      }
      hits.push({
        id: item.id,
        collection: meta.slug,
        number: item.number,
        arabic: item.arabic,
        titleAr: meta.titleAr,
        titleEn: meta.titleEn,
        href: `/hadith/${meta.slug}/${item.number}`,
      });
    }
  }

  return { hits: hits.slice(0, limit), total: hits.length };
}
