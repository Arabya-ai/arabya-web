import type { IrabBookPayload, IrabBookVerse } from "@/lib/import-book/types";

type RawRow = Record<string, unknown>;

const SURAH_KEYS = ["surah", "sura", "s", "surah_id", "surahid", "سورة", "س"];
const VERSE_KEYS = ["verse", "ayah", "aya", "v", "verse_id", "آية", "اية", "آيه"];
const WORD_ID_KEYS = [
  "wordid",
  "word_id",
  "word id",
  "id",
  "w",
  "معرف",
  "معرف_الكلمة",
];
const TEXT_KEYS = [
  "text",
  "irab",
  "i3rab",
  "irib",
  "commentary",
  "body",
  "إعراب",
  "عراب",
  "نص",
  "content",
];
const VERSE_TEXT_KEYS = ["verse_text", "ayah_text", "نص_الآية", "الآية"];

function normKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, "_");
}

function pick(row: RawRow, keys: string[]): string {
  for (const [k, v] of Object.entries(row)) {
    const nk = normKey(k);
    if (keys.includes(nk) && v != null && String(v).trim()) {
      return String(v).trim();
    }
  }
  return "";
}

function parseVerseKeyFromParts(surahRaw: string, verseRaw: string): string | null {
  const surah = Number(surahRaw);
  const verse = Number(verseRaw);
  if (!Number.isFinite(surah) || !Number.isFinite(verse)) return null;
  if (surah < 1 || surah > 114 || verse < 1) return null;
  return `${surah}:${verse}`;
}

function parseVerseKeyCell(raw: string): string | null {
  const t = raw.trim();
  const m = t.match(/^(\d{1,3})\s*[:\u060C،]\s*(\d{1,3})$/);
  if (m) return parseVerseKeyFromParts(m[1]!, m[2]!);
  return null;
}

function normalizeWordId(raw: string): string | null {
  const t = raw.trim();
  if (/^W:\d{3}:\d{3}:\d{3}$/i.test(t)) return t.toUpperCase();
  const m = t.match(/^(\d{1,3})\s*[:\-]\s*(\d{1,3})\s*[:\-]\s*(\d{1,3})$/);
  if (m) {
    const s = m[1]!.padStart(3, "0");
    const v = m[2]!.padStart(3, "0");
    const w = m[3]!.padStart(3, "0");
    return `W:${s}:${v}:${w}`;
  }
  return null;
}

export function rowsToIrabPayload(
  rows: RawRow[],
  meta: { title: string; license?: string; source?: string },
): IrabBookPayload {
  const byVerse = new Map<string, IrabBookVerse>();

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;

    let verseKey =
      parseVerseKeyCell(pick(row, ["versekey", "verse_key", "key", "مفتاح"])) ||
      parseVerseKeyFromParts(
        pick(row, SURAH_KEYS),
        pick(row, VERSE_KEYS),
      );

    const wordId = normalizeWordId(pick(row, WORD_ID_KEYS));
    const wordText = pick(row, TEXT_KEYS);
    const verseText = pick(row, VERSE_TEXT_KEYS);

    if (!verseKey && wordId) {
      const parts = wordId.match(/^W:(\d{3}):(\d{3}):/i);
      if (parts) {
        verseKey = `${Number(parts[1])}:${Number(parts[2])}`;
      }
    }

    if (!verseKey) continue;

    if (!byVerse.has(verseKey)) {
      byVerse.set(verseKey, { verseKey, words: [] });
    }
    const bucket = byVerse.get(verseKey)!;

    if (verseText && !bucket.text) bucket.text = verseText;

    if (wordId && wordText) {
      bucket.words = bucket.words ?? [];
      bucket.words.push({ wordId, text: wordText });
    } else if (wordText && !wordId) {
      bucket.text = bucket.text ? `${bucket.text}\n${wordText}` : wordText;
    }
  }

  const verses = [...byVerse.values()].sort((a, b) => {
    const [as, av] = a.verseKey.split(":").map(Number);
    const [bs, bv] = b.verseKey.split(":").map(Number);
    return as! - bs! || av! - bv!;
  });

  if (verses.length === 0) {
    throw new Error("no_rows_parsed");
  }

  return {
    meta: {
      title: meta.title,
      license: meta.license ?? "owner",
      source: meta.source ?? "owner-upload",
    },
    verses,
  };
}

export function countPayloadStats(payload: IrabBookPayload): {
  verseCount: number;
  wordCount: number;
} {
  let wordCount = 0;
  for (const v of payload.verses) {
    wordCount += v.words?.length ?? 0;
  }
  return { verseCount: payload.verses.length, wordCount };
}
