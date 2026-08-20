/** Light Arabic text normalization for matching (not for display). */

const TASHKEEL_RE = /[\u064B-\u065F\u0670]/g;
const TATWEEL_RE = /\u0640/g;

export function stripTashkeel(text: string): string {
  return text.replace(TASHKEEL_RE, "").replace(TATWEEL_RE, "");
}

export function normalizeArabicForMatch(text: string): string {
  return stripTashkeel(text)
    .replace(/\u0623|\u0625|\u0622/g, "\u0627") // أ إ آ → ا
    .replace(/\u0649/g, "\u064A") // ى → ي
    .replace(/\u0629/g, "\u0647") // ة → ه for fuzzy match only
    .replace(/\s+/g, " ")
    .trim();
}

export function collapseSpaces(text: string): string {
  return text.replace(/[ \t\u00A0]+/g, " ").replace(/\n{3,}/g, "\n\n");
}
