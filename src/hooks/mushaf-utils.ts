import type { QuranWord } from "@/lib/types";

export type MeaningLang = "ar" | "en" | "id" | "ur";

export type WordRef = { surahId: number; verse: number; position: number };

export const FONT_KEY = "arabya-mushaf-font";
export const LAST_PAGE_KEY = "arabya-last-mushaf-page";
export const MEANING_LANG_KEY = "arabya-meaning-lang";
export const VERSE_TRANS_KEY = "arabya-verse-trans";
export const RECITER_KEY = "arabya-reciter";

export const FONT_SCALE_MIN = 0.7;
export const FONT_SCALE_MAX = 1.6;
export const FONT_SCALE_STEP = 0.1;

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
