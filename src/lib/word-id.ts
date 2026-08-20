/** Canonical word IDs across Arabya corpora. */

/** Quran: W:SSS:VVV:PPP (surah:verse:position, zero-padded). */
export function makeWordId(
  surahId: number,
  verse: number,
  position: number,
): string {
  return `W:${pad3(surahId)}:${pad3(verse)}:${pad3(position)}`;
}

export function parseWordId(
  wordId: string,
): { surahId: number; verse: number; position: number } | null {
  const m = /^W:(\d{3}):(\d{3}):(\d{3})$/.exec(wordId.trim());
  if (!m) return null;
  return {
    surahId: Number(m[1]),
    verse: Number(m[2]),
    position: Number(m[3]),
  };
}

/**
 * Hadith word: HW:{collection}:{number}:{PPP}
 * collection is a safe slug (lowercase alnum + hyphen).
 */
export function makeHadithWordId(
  collection: string,
  number: number,
  position: number,
): string {
  const slug = sanitizeSlug(collection);
  return `HW:${slug}:${number}:${pad3(position)}`;
}

export function parseHadithWordId(wordId: string): {
  collection: string;
  number: number;
  position: number;
} | null {
  const m = /^HW:([a-z0-9-]+):(\d+):(\d{3})$/i.exec(wordId.trim());
  if (!m) return null;
  return {
    collection: m[1].toLowerCase(),
    number: Number(m[2]),
    position: Number(m[3]),
  };
}

/** Heritage / poetry word: TW:{workSlug}:{passage}:{PPP} */
export function makeHeritageWordId(
  workSlug: string,
  passageIndex: number,
  position: number,
): string {
  return `TW:${sanitizeSlug(workSlug)}:${passageIndex}:${pad3(position)}`;
}

export function parseHeritageWordId(wordId: string): {
  workSlug: string;
  passageIndex: number;
  position: number;
} | null {
  const m = /^TW:([a-z0-9-]+):(\d+):(\d{3})$/i.exec(wordId.trim());
  if (!m) return null;
  return {
    workSlug: m[1].toLowerCase(),
    passageIndex: Number(m[2]),
    position: Number(m[3]),
  };
}

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

function sanitizeSlug(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
