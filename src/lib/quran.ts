import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  IrabSurah,
  RootEntry,
  RootsIndex,
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

/** Keep only morphology for the verses shown on a mushaf page (cuts multi‑MB payloads). */
export function sliceIrabToVerseNumbers(
  irab: IrabSurah | null,
  verseNumbers: Iterable<number>,
): IrabSurah | null {
  if (!irab) return null;
  const wanted = verseNumbers instanceof Set ? verseNumbers : new Set(verseNumbers);
  if (wanted.size === 0) {
    return { ...irab, verses: [] };
  }
  return {
    ...irab,
    verses: irab.verses.filter((v) => wanted.has(v.verseNumber)),
  };
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

/**
 * Strip tashkeel / Quran marks and normalize orthography so plain Arabic
 * queries match Uthmani text (e.g. ابراهيم ↔ إِبۡرَٰهِـۧمَ).
 */
export function normalizeArabicSearch(input: string): string {
  return String(input || "")
    .normalize("NFKD")
    .replace(/\u0670/g, "ا") // dagger alef → alef
    .replace(/\u06E5/g, "و") // small waw
    .replace(/[\u06E6\u06E7]/g, "ي") // small yeh / small high yeh
    .replace(
      /[\u064B-\u065F\u06D6-\u06ED\u0640\u06DE-\u06E4\u06E8-\u06ED\u0610-\u061A\u08F0-\u08FF]/g,
      "",
    )
    .replace(/[ٱأإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0621-\u064A0-9:\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Drop alefs for a secondary match (الرحمن ↔ الرحمان). */
export function foldArabicAlefs(input: string): string {
  return input.replace(/ا/g, "");
}

let searchCache: SearchHit[] | null = null;
let searchNormCache:
  | { hit: SearchHit; norm: string; fold: string }[]
  | null = null;
let rootsIndexCache: RootsIndex | null | undefined;

export async function getRootsIndex(): Promise<RootsIndex | null> {
  if (rootsIndexCache !== undefined) return rootsIndexCache;
  try {
    const raw = await readFile(
      path.join(dataRoot, "roots-index.json"),
      "utf8",
    );
    rootsIndexCache = JSON.parse(raw) as RootsIndex;
    return rootsIndexCache;
  } catch {
    rootsIndexCache = null;
    return null;
  }
}

export async function getRootEntry(root: string): Promise<RootEntry | null> {
  const index = await getRootsIndex();
  if (!index) return null;
  const decoded = decodeURIComponent(root);
  return index.roots.find((r) => r.root === decoded) ?? null;
}

/**
 * Match a user query to a morphology root (exact normalized form).
 * Prefers exact root equality after Arabic normalization.
 */
export async function findRootByQuery(
  query: string,
): Promise<RootEntry | null> {
  const qNorm = normalizeArabicSearch(query);
  if (qNorm.length < 2 || qNorm.length > 8) return null;

  const index = await getRootsIndex();
  if (!index) return null;

  const exact = index.roots.find((r) => normalizeArabicSearch(r.root) === qNorm);
  if (exact) return exact;

  // Short queries only — avoid noisy prefix matches on long ayah text.
  if (qNorm.length >= 3 && qNorm.length <= 5) {
    const prefixed = index.roots.filter((r) =>
      normalizeArabicSearch(r.root).startsWith(qNorm),
    );
    if (prefixed.length === 1) return prefixed[0];
  }

  return null;
}

export type SearchAyahsOptions = {
  /** Max hits to return (after offset). Use a large value for «all results». */
  limit?: number;
  offset?: number;
};

export type SearchAyahsResult = {
  hits: SearchHit[];
  total: number;
};

/**
 * Search ayah text (and verse keys). Does not flood results with every ayah
 * of a matching surah name — the surah grid already filters by name.
 */
export async function searchAyahs(
  query: string,
  options: number | SearchAyahsOptions = {},
): Promise<SearchAyahsResult> {
  const opts: SearchAyahsOptions =
    typeof options === "number" ? { limit: options } : options;
  const limit = Math.max(0, opts.limit ?? 40);
  const offset = Math.max(0, opts.offset ?? 0);

  const q = query.trim();
  if (q.length < 2) return { hits: [], total: 0 };

  if (!searchCache) {
    const raw = await readFile(
      path.join(dataRoot, "search-index.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as { verses: SearchHit[] };
    searchCache = parsed.verses;
    searchNormCache = null;
  }

  if (!searchNormCache) {
    searchNormCache = searchCache.map((hit) => {
      const norm = normalizeArabicSearch(hit.text);
      return { hit, norm, fold: foldArabicAlefs(norm) };
    });
  }

  const qNorm = normalizeArabicSearch(q);
  const qFold = foldArabicAlefs(qNorm);
  const digits = q.replace(/[^\d:]/g, "");
  const keyHits: SearchHit[] = [];
  const textHits: SearchHit[] = [];

  for (const row of searchNormCache) {
    const v = row.hit;
    if (v.key === q || v.key === digits || String(v.surahId) === q) {
      keyHits.push(v);
      continue;
    }
    if (qNorm.length < 2) continue;
    const textMatch =
      row.norm.includes(qNorm) ||
      (qFold.length >= 3 && row.fold.includes(qFold));
    if (textMatch) textHits.push(v);
  }

  const matched = keyHits.length ? keyHits : textHits;
  const total = matched.length;
  const hits = matched.slice(offset, offset + limit);
  return { hits, total };
}
