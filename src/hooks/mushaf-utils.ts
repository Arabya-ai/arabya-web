import type { QuranWord } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/storage-keys";

export type MeaningLang = "ar" | "en" | "id" | "ur";

export type WordRef = { surahId: number; verse: number; position: number };

/** Madinah Uthmani basmalah (QPC/Hafs style). */
export const BASMALAH_UTHMANI = "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ";

/** Traditional mushaf: no basmalah before Al-Fatiha or At-Tawbah. */
export function surahHasBasmalah(surahId: number): boolean {
  return surahId !== 1 && surahId !== 9;
}

/** Show basmalah only on the page that contains the surah's first ayah. */
export function shouldRenderBasmalah(
  surahId: number,
  verses: { verseNumber: number }[],
): boolean {
  return (
    surahHasBasmalah(surahId) &&
    verses.some((v) => v.verseNumber === 1)
  );
}

/** @deprecated Prefer STORAGE_KEYS — kept for existing imports. */
export const FONT_KEY = STORAGE_KEYS.mushafFontScale;
export const LAST_PAGE_KEY = STORAGE_KEYS.lastMushafPage;
export const MEANING_LANG_KEY = STORAGE_KEYS.meaningLang;
export const VERSE_TRANS_KEY = STORAGE_KEYS.verseTrans;
export const RECITER_KEY = STORAGE_KEYS.reciter;

export const FONT_SCALE_MIN = 0.7;
export const FONT_SCALE_MAX = 1.6;
export const FONT_SCALE_STEP = 0.1;
/** Default mushaf text size (100%). */
export const FONT_SCALE_DEFAULT = 1;

export function clampFontScale(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, rounded));
}

export function wordMeaning(word: QuranWord, lang: MeaningLang): string {
  if (lang === "ar") return word.meaningAr || word.meaning || "";
  if (lang === "id") return word.meaningId || word.meaning || "";
  if (lang === "ur") return word.meaningUr || word.meaning || "";
  return word.meaning || "";
}
