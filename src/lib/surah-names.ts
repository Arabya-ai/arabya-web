import uthmaniNames from "../../data/surah-names-uthmani.json";
import enNames from "../../data/surah-names-en.json";

const names = uthmaniNames as Record<string, string>;
const namesEn = enNames as Record<string, string>;

export function getSurahUthmaniTitle(surahId: number): string {
  return names[String(surahId)] ?? `سُورَةُ ${surahId}`;
}

export function getSurahUthmaniChipName(surahId: number): string {
  const full = getSurahUthmaniTitle(surahId);
  return full.replace(/^سُورَةُ\s+/, "");
}

/** English surah labels matching common index naming (e.g. Fatiha, Baqarah). */
export function getSurahEnglishName(surahId: number): string {
  return namesEn[String(surahId)] ?? `Surah ${surahId}`;
}

/** Locale-aware display name for surah chips / lists. */
export function getSurahDisplayName(
  surahId: number,
  locale: string = "ar",
): string {
  if (locale === "en") return getSurahEnglishName(surahId);
  return getSurahUthmaniChipName(surahId);
}

export function getSurahDisplayTitle(
  surahId: number,
  locale: string = "ar",
): string {
  if (locale === "en") return getSurahEnglishName(surahId);
  return getSurahUthmaniTitle(surahId);
}
