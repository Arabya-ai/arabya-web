/** Display helpers for translation editions. */

import type { VerseTranslationEdition } from "@/lib/types";

/** Prefer native-language label for visitors who read that language. */
export function editionDisplayName(ed: VerseTranslationEdition): string {
  return ed.nameNative?.trim() || ed.nameEn?.trim() || ed.nameAr?.trim() || ed.slug;
}
