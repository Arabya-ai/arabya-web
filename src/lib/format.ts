const EASTERN_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toArabicNumerals(value: number | string): string {
  return String(value).replace(/\d/g, (d) => EASTERN_DIGITS[Number(d)] ?? d);
}

export function formatVerseKey(key: string): string {
  return toArabicNumerals(key);
}

export function getMushafPageHref(page: number): string {
  return `/mushaf/${page}`;
}
