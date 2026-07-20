import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  IrabSurah,
  SurahContent,
  SurahMeta,
  TafsirSource,
  TafsirSurah,
  VerseTranslationEdition,
  VerseTranslationSurah,
} from "./types";

const dataRoot = path.join(process.cwd(), "data");

export async function getSurahs(): Promise<SurahMeta[]> {
  const raw = await readFile(path.join(dataRoot, "surahs.json"), "utf8");
  return JSON.parse(raw) as SurahMeta[];
}

export async function getSurah(id: number): Promise<SurahContent | null> {
  try {
    const raw = await readFile(
      path.join(dataRoot, "surahs", `${id}.json`),
      "utf8",
    );
    return JSON.parse(raw) as SurahContent;
  } catch {
    return null;
  }
}

export async function getSurahMeta(id: number): Promise<SurahMeta | undefined> {
  const surahs = await getSurahs();
  return surahs.find((s) => s.id === id);
}

export async function getIrab(id: number): Promise<IrabSurah | null> {
  try {
    const raw = await readFile(path.join(dataRoot, "irab", `${id}.json`), "utf8");
    return JSON.parse(raw) as IrabSurah;
  } catch {
    return null;
  }
}

export async function getTafsirSources(): Promise<TafsirSource[]> {
  try {
    const raw = await readFile(
      path.join(dataRoot, "tafsirs", "index.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as { sources: TafsirSource[] };
    return parsed.sources ?? [];
  } catch {
    return [];
  }
}

export async function getTafsir(
  slug: string,
  id: number,
): Promise<TafsirSurah | null> {
  try {
    const raw = await readFile(
      path.join(dataRoot, "tafsirs", slug, `${id}.json`),
      "utf8",
    );
    return JSON.parse(raw) as TafsirSurah;
  } catch {
    return null;
  }
}

export async function getVerseTranslationEditions(): Promise<
  VerseTranslationEdition[]
> {
  try {
    const raw = await readFile(
      path.join(dataRoot, "translations", "index.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as {
      verseEditions: VerseTranslationEdition[];
    };
    return parsed.verseEditions ?? [];
  } catch {
    return [];
  }
}

export async function getVerseTranslation(
  slug: string,
  id: number,
): Promise<VerseTranslationSurah | null> {
  try {
    const raw = await readFile(
      path.join(dataRoot, "translations", slug, `${id}.json`),
      "utf8",
    );
    return JSON.parse(raw) as VerseTranslationSurah;
  } catch {
    return null;
  }
}

export type SearchHit = {
  key: string;
  surahId: number;
  verse: number;
  page: number;
  text: string;
  nameAr: string;
};

let searchCache: SearchHit[] | null = null;

export async function searchAyahs(
  query: string,
  limit = 40,
): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  if (!searchCache) {
    const raw = await readFile(
      path.join(dataRoot, "search-index.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as { verses: SearchHit[] };
    searchCache = parsed.verses;
  }

  const digits = q.replace(/[^\d:]/g, "");
  const hits: SearchHit[] = [];

  for (const v of searchCache) {
    if (
      v.key === q ||
      v.key === digits ||
      String(v.surahId) === q ||
      v.nameAr.includes(q) ||
      v.text.includes(q)
    ) {
      hits.push(v);
      if (hits.length >= limit) break;
    }
  }
  return hits;
}
