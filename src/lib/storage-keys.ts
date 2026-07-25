/**
 * Single source of truth for browser storage keys.
 * Keep string values stable — changing them resets user prefs.
 *
 * Note: `src/app/layout.tsx` inlines `THEME` in a boot script (must match).
 */

export const STORAGE_KEYS = {
  theme: "arabya-theme",
  prayerCity: "arabya-prayer-city",
  bookmarks: "arabya-bookmarks",
  ayahNotes: "arabya-ayah-notes",
  studyArchive: "arabya-study-archive-v1",
  dataRev: "arabya-data-rev",
  readingHabit: "arabya-reading-habit",
  readingHabitKhatmPages: "arabya-reading-habit:khatm-pages",
  lastMushafPage: "arabya-last-mushaf-page",
  mushafFontScale: "arabya-mushaf-font-scale",
  meaningLang: "arabya-meaning-lang",
  verseTrans: "arabya-verse-trans",
  reciter: "arabya-reciter",
  /** UI locale preference (ar | en) — separate from meaningLang / verseTrans */
  uiLocale: "arabya-ui-locale",
  studyQuery: "arabya-study-query",
  autosyncDone: "arabya-autosync-done",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** Daily page-count key for reading habit. */
export function readingHabitPagesKey(isoDate: string): string {
  return `arabya-reading-habit:pages:${isoDate}`;
}
