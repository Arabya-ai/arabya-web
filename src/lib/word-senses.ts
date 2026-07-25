import { readFile } from "node:fs/promises";
import path from "node:path";
import type { WordSenseEntry, WordSensesSurah } from "@/lib/types";

const dataRoot = path.join(process.cwd(), "data");

export type { WordSenseEntry, WordSensesSurah };

export type LexiconEntry = {
  text: string;
  url?: string | null;
  lemma?: string | null;
};

export type QuranWordsLexicon = {
  source: string;
  sourceLabel?: string;
  sourceUrl?: string;
  entryCount: number;
  entries: Record<string, LexiconEntry>;
};

let lexiconCache: Promise<QuranWordsLexicon | null> | null = null;

export async function getWordSenses(
  surahId: number,
): Promise<WordSensesSurah | null> {
  try {
    const raw = await readFile(
      path.join(dataRoot, "word-senses", `${surahId}.json`),
      "utf8",
    );
    return JSON.parse(raw) as WordSensesSurah;
  } catch {
    return null;
  }
}

export async function getQuranWordsLexicon(): Promise<QuranWordsLexicon | null> {
  if (!lexiconCache) {
    lexiconCache = (async () => {
      try {
        const raw = await readFile(
          path.join(dataRoot, "lexicon", "quran-words.json"),
          "utf8",
        );
        return JSON.parse(raw) as QuranWordsLexicon;
      } catch {
        return null;
      }
    })();
  }
  return lexiconCache;
}

/** Resolve lexicon texts for the keys present on a mushaf page (keeps payload small). */
export async function resolveLexiconMap(
  keys: Iterable<string>,
): Promise<Record<string, string>> {
  const wanted = [...new Set([...keys].filter(Boolean))];
  if (!wanted.length) return {};
  const lexicon = await getQuranWordsLexicon();
  if (!lexicon) return {};
  const out: Record<string, string> = {};
  for (const key of wanted) {
    const text = lexicon.entries[key]?.text?.trim();
    if (text) out[key] = text;
  }
  return out;
}

export function sliceWordSensesToVerseNumbers(
  senses: WordSensesSurah | null,
  verseNumbers: Iterable<number>,
): WordSensesSurah | null {
  if (!senses) return null;
  const wanted = verseNumbers instanceof Set ? verseNumbers : new Set(verseNumbers);
  if (wanted.size === 0) return { ...senses, words: {}, wordCount: 0 };
  const words: Record<string, WordSenseEntry> = {};
  for (const [wordId, entry] of Object.entries(senses.words)) {
    const m = /^W:\d{3}:(\d{3}):\d{3}$/.exec(wordId);
    if (!m) continue;
    const verse = Number(m[1]);
    if (wanted.has(verse)) words[wordId] = entry;
  }
  return { ...senses, words, wordCount: Object.keys(words).length };
}
