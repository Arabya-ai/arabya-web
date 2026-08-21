/**
 * Shared catalog for /services hub and the header mega menu.
 * Keep in sync with live routes — guests must keep reading without login.
 */

export type ArabyaServiceCategory =
  | "read"
  | "ibadah"
  | "knowledge"
  | "create";

export type ArabyaServiceIcon =
  | "mushaf"
  | "juz"
  | "roots"
  | "qiraat"
  | "asma"
  | "reciters"
  | "adhkar"
  | "qibla"
  | "tahfeez"
  | "study"
  | "studio"
  | "library"
  | "books"
  | "hadith"
  | "heritage"
  | "resources"
  | "lughawi";

export type ArabyaServiceId = ArabyaServiceIcon;

export type ArabyaServiceEntry = {
  id: ArabyaServiceId;
  href: string;
  icon: ArabyaServiceIcon;
  category: ArabyaServiceCategory;
};

/** Order shown on the services page and mega menu. */
export const ARABYA_SERVICES: readonly ArabyaServiceEntry[] = [
  { id: "mushaf", href: "/mushaf/1", icon: "mushaf", category: "read" },
  { id: "juz", href: "/juz", icon: "juz", category: "read" },
  { id: "roots", href: "/roots", icon: "roots", category: "read" },
  { id: "study", href: "/study", icon: "study", category: "read" },
  { id: "qiraat", href: "/qiraat", icon: "qiraat", category: "read" },
  { id: "adhkar", href: "/adhkar", icon: "adhkar", category: "ibadah" },
  { id: "qibla", href: "/qibla", icon: "qibla", category: "ibadah" },
  { id: "asma", href: "/asma", icon: "asma", category: "ibadah" },
  { id: "tahfeez", href: "/tahfeez", icon: "tahfeez", category: "ibadah" },
  { id: "reciters", href: "/reciters", icon: "reciters", category: "ibadah" },
  { id: "hadith", href: "/hadith", icon: "hadith", category: "knowledge" },
  { id: "heritage", href: "/heritage", icon: "heritage", category: "knowledge" },
  { id: "library", href: "/library", icon: "library", category: "knowledge" },
  { id: "books", href: "/books", icon: "books", category: "knowledge" },
  { id: "resources", href: "/resources", icon: "resources", category: "knowledge" },
  { id: "studio", href: "/studio", icon: "studio", category: "create" },
  { id: "lughawi", href: "/lughawi", icon: "lughawi", category: "create" },
] as const;

export const ARABYA_SERVICE_CATEGORIES: readonly ArabyaServiceCategory[] = [
  "read",
  "ibadah",
  "knowledge",
  "create",
] as const;

export function servicesByCategory(
  category: ArabyaServiceCategory,
): ArabyaServiceEntry[] {
  return ARABYA_SERVICES.filter((s) => s.category === category);
}
