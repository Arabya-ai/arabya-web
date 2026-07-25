const EASTERN_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toArabicNumerals(value: number | string): string {
  return String(value).replace(/\d/g, (d) => EASTERN_DIGITS[Number(d)] ?? d);
}

/** Locale-aware digit formatting (Eastern on Arabic UI, Latin otherwise). */
export function formatCount(value: number | string, locale: string = "ar"): string {
  return locale === "ar" ? toArabicNumerals(value) : String(value);
}

export function formatVerseKey(key: string, locale: string = "ar"): string {
  return formatCount(key, locale);
}

export function getMushafPageHref(page: number): string {
  return `/mushaf/${page}`;
}
