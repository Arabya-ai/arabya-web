/** Display helpers for translation editions. */

import type { VerseTranslationEdition } from "@/lib/types";

/** Prefer native-language label for visitors who read that language. */
export function editionDisplayName(ed: VerseTranslationEdition): string {
  return ed.nameNative?.trim() || ed.nameEn?.trim() || ed.nameAr?.trim() || ed.slug;
}

const LANG_GROUP_LABELS: Record<string, string> = {
  en: "English",
  id: "Bahasa Indonesia",
  tr: "Türkçe",
  ur: "اردو",
  bn: "বাংলা",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  ru: "Русский",
  zh: "中文",
  ar: "العربية",
  sq: "Shqip",
  bs: "Bosanski",
  fa: "فارسی",
  hi: "हिन्दी",
  ms: "Bahasa Melayu",
  nl: "Nederlands",
  pt: "Português",
  sw: "Kiswahili",
  ta: "தமிழ்",
};

/** Stable display label for an edition language code. */
export function editionLangGroupLabel(lang: string): string {
  const key = lang.trim().toLowerCase();
  return LANG_GROUP_LABELS[key] || lang.toUpperCase();
}

/**
 * Group editions by `lang` for `<optgroup>` UI.
 * Order: known preferred langs first, then alphabetical by group label.
 */
export function groupVerseEditionsByLang(
  editions: VerseTranslationEdition[],
): { lang: string; label: string; editions: VerseTranslationEdition[] }[] {
  const preferred = ["en", "id", "tr", "ur", "fr", "de", "bn", "ru", "zh", "ar"];
  const map = new Map<string, VerseTranslationEdition[]>();

  for (const ed of editions) {
    const lang = (ed.lang || "other").trim().toLowerCase() || "other";
    const list = map.get(lang);
    if (list) list.push(ed);
    else map.set(lang, [ed]);
  }

  const langs = [...map.keys()].sort((a, b) => {
    const ia = preferred.indexOf(a);
    const ib = preferred.indexOf(b);
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
    return editionLangGroupLabel(a).localeCompare(
      editionLangGroupLabel(b),
      "en",
    );
  });

  return langs.map((lang) => ({
    lang,
    label: editionLangGroupLabel(lang),
    editions: map.get(lang) ?? [],
  }));
}
