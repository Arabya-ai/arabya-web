import uthmaniNames from "../../data/surah-names-uthmani.json";

const names = uthmaniNames as Record<string, string>;

export function getSurahUthmaniTitle(surahId: number): string {
  return names[String(surahId)] ?? `سُورَةُ ${surahId}`;
}

export function getSurahUthmaniChipName(surahId: number): string {
  const full = getSurahUthmaniTitle(surahId);
  return full.replace(/^سُورَةُ\s+/, "");
}
