/**
 * Client-safe Arabic orthography helpers (no Node APIs).
 * Used by search, hadith, and the independent NLP toolkit page.
 */

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

/**
 * Limited, intentional query variants (not fuzzy search).
 * Currently: optional definite article ال — strip or add when the stem is long enough.
 */
export function expandSearchQueryVariants(qNorm: string): string[] {
  const q = qNorm.trim();
  if (q.length < 2) return [];
  const out = new Set<string>([q]);
  if (q.startsWith("ال") && q.length >= 5) {
    out.add(q.slice(2));
  } else if (!q.startsWith("ال") && q.length >= 3) {
    out.add(`ال${q}`);
  }
  return [...out];
}
