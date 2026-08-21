import { getSurah, getSurahs } from "@/lib/quran";
import { getSurahDisplayName } from "@/lib/surah-names";
import type { SurahMeta } from "@/lib/types";
import {
  TAHFEEZ_MAX_AYAHS,
  type TahfeezSurahOption,
  type TahfeezVersePayload,
} from "@/lib/tahfeez/paths";

export type { TahfeezSurahOption, TahfeezVersePayload };
export { TAHFEEZ_MAX_AYAHS, tahfeezHref } from "@/lib/tahfeez/paths";

export type TahfeezSessionLoad = {
  surahId: number;
  surahName: string;
  ayahFrom: number;
  ayahTo: number;
  ayahCount: number;
  verses: TahfeezVersePayload[];
  catalog: TahfeezSurahOption[];
};

function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const n = typeof raw === "string" || typeof raw === "number" ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/** Parse /tahfeez?surah=&from=&to= into a bounded verse window (all 114 surahs). */
export async function loadTahfeezSession(
  locale: string,
  searchParams: Record<string, string | string[] | undefined>,
): Promise<TahfeezSessionLoad> {
  const loc = locale === "en" ? "en" : "ar";
  const surahs = await getSurahs();
  const catalog: TahfeezSurahOption[] = surahs.map((s: SurahMeta) => ({
    id: s.id,
    name: getSurahDisplayName(s.id, loc),
    versesCount: s.versesCount,
  }));

  const surahRaw = Array.isArray(searchParams.surah)
    ? searchParams.surah[0]
    : searchParams.surah;
  const fromRaw = Array.isArray(searchParams.from)
    ? searchParams.from[0]
    : searchParams.from;
  const toRaw = Array.isArray(searchParams.to)
    ? searchParams.to[0]
    : searchParams.to;
  const ayahRaw = Array.isArray(searchParams.ayah)
    ? searchParams.ayah[0]
    : searchParams.ayah;

  const surahId = clampInt(surahRaw, 1, 114, 1);
  const surah = await getSurah(surahId);
  const ayahCount = surah?.verses.length ?? 1;

  const ayahFrom = clampInt(fromRaw ?? ayahRaw, 1, ayahCount, 1);
  let ayahTo = clampInt(
    toRaw,
    ayahFrom,
    Math.min(ayahFrom + TAHFEEZ_MAX_AYAHS - 1, ayahCount),
    Math.min(ayahFrom + Math.min(14, TAHFEEZ_MAX_AYAHS - 1), ayahCount),
  );
  if (ayahTo < ayahFrom) ayahTo = ayahFrom;
  if (ayahTo - ayahFrom + 1 > TAHFEEZ_MAX_AYAHS) {
    ayahTo = ayahFrom + TAHFEEZ_MAX_AYAHS - 1;
  }

  const verses: TahfeezVersePayload[] =
    surah?.verses
      .filter((v) => v.verseNumber >= ayahFrom && v.verseNumber <= ayahTo)
      .map((v) => ({
        verseNumber: v.verseNumber,
        words: v.words
          .filter((w) => w.charType !== "end")
          .map((w) => ({ text: w.text, position: w.position })),
      })) ?? [];

  return {
    surahId,
    surahName: getSurahDisplayName(surahId, loc),
    ayahFrom,
    ayahTo,
    ayahCount,
    verses,
    catalog,
  };
}
