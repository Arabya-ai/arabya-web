export type LibraryCategoryMeta = {
  id: string;
  labelAr: string;
  labelEn: string;
};

export const LIBRARY_CATEGORIES: LibraryCategoryMeta[] = [
  { id: "nahw", labelAr: "النحو", labelEn: "Grammar" },
  { id: "sarf", labelAr: "الصرف", labelEn: "Morphology" },
  { id: "balagha", labelAr: "البلاغة", labelEn: "Rhetoric" },
  { id: "lugha", labelAr: "اللغة", labelEn: "Language" },
  { id: "usul", labelAr: "الأصول", labelEn: "Principles" },
  { id: "tafsir", labelAr: "التفسير", labelEn: "Tafsir" },
  { id: "education", labelAr: "تعليم عام", labelEn: "General education" },
  { id: "other", labelAr: "متنوع", labelEn: "Other" },
];

export function libraryCategoryLabel(
  id: string | undefined,
  locale: string,
  extras: LibraryCategoryMeta[] = [],
): string {
  const cat = [...LIBRARY_CATEGORIES, ...extras].find((c) => c.id === id);
  if (!cat) return id || (locale === "en" ? "General" : "عام");
  return locale === "en" ? cat.labelEn : cat.labelAr;
}

export function normalizeLibraryCategory(id?: string): string {
  const trimmed = id?.trim();
  return trimmed || "education";
}

export function categoryCoverTone(id: string | undefined): string {
  switch (normalizeLibraryCategory(id)) {
    case "nahw":
      return "library-cover--nahw";
    case "sarf":
      return "library-cover--sarf";
    case "balagha":
      return "library-cover--balagha";
    case "tafsir":
      return "library-cover--tafsir";
    default:
      return "library-cover--default";
  }
}
