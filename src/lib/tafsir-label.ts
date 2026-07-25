import type { TafsirSource } from "@/lib/types";

/** Display label for a tafsir source in the active UI locale. */
export function tafsirDisplayName(
  source: TafsirSource,
  locale: string = "ar",
): string {
  if (locale === "en") {
    return source.nameEn?.trim() || source.nameAr;
  }
  return source.nameAr;
}

/**
 * Order tafsir sources for the UI: preferred language first, then the other.
 * Keeps relative order within each language group.
 */
export function orderTafsirSources(
  sources: TafsirSource[],
  locale: string = "ar",
): TafsirSource[] {
  const preferEn = locale === "en";
  const preferred: TafsirSource[] = [];
  const other: TafsirSource[] = [];
  for (const s of sources) {
    const isEn = (s.lang ?? "ar") === "en";
    if (preferEn ? isEn : !isEn) preferred.push(s);
    else other.push(s);
  }
  return [...preferred, ...other];
}
