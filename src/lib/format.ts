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

/** Safe localeCompare — avoids Sentry crashes when sort keys are missing (editor overrides). */
export function localeCompareSafe(
  a: string | null | undefined,
  b: string | null | undefined,
  locale: string = "ar",
): number {
  const sa = (a ?? "").trim();
  const sb = (b ?? "").trim();
  if (!sa && !sb) return 0;
  if (!sa) return 1;
  if (!sb) return -1;
  return sa.localeCompare(sb, locale === "en" ? "en" : "ar");
}
