/**
 * Normalize Arabic Quran text for loose matching (Hifz word check).
 * Strips tashkeel / tatweel; keeps letters for sequence alignment.
 */

const TASHKEEL =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D4-\u08FF]/g;
const TATWEEL = /\u0640/g;
const ALEF_VARIANTS = /[أإآٱ]/g;
const YEH_VARIANTS = /[ىي]/g;
const TEH_MARBUTA = /ة/g;

export function stripTashkeel(text: string): string {
  return text.replace(TASHKEEL, "").replace(TATWEEL, "");
}

export function normalizeArabicToken(raw: string): string {
  return stripTashkeel(raw)
    .replace(ALEF_VARIANTS, "ا")
    .replace(YEH_VARIANTS, "ي")
    .replace(TEH_MARBUTA, "ه")
    .replace(/[^\u0600-\u06FF]/g, "")
    .trim();
}

export function tokenizeHypothesis(text: string): string[] {
  return stripTashkeel(text)
    .split(/\s+/)
    .map((w) => normalizeArabicToken(w))
    .filter(Boolean);
}

export function tokenizeExpected(words: string[]): string[] {
  return words.map((w) => normalizeArabicToken(w)).filter(Boolean);
}
