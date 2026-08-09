import type { IrabSurah } from "@/lib/types";
import type { MushafPageContent } from "@/lib/mushaf";
import { getIrab, sliceIrabToVerseNumbers } from "@/lib/quran";
import {
  getWordSenses,
  resolveLexiconMap,
  sliceWordSensesToVerseNumbers,
  type WordSensesSurah,
} from "@/lib/word-senses";

export type MushafPageStudyPayload = {
  irabBySurah: Record<number, IrabSurah | null>;
  sensesBySurah: Record<number, WordSensesSurah | null>;
  lexiconByKey: Record<string, string>;
};

/** Build page-scoped morphology/senses/lexicon (not full-surah dumps). */
export async function loadMushafPageStudy(
  pageContent: MushafPageContent,
): Promise<MushafPageStudyPayload> {
  const surahIds = [...new Set(pageContent.blocks.map((b) => b.surahId))];
  const verseNumbersBySurah = new Map<number, Set<number>>();
  for (const block of pageContent.blocks) {
    let set = verseNumbersBySurah.get(block.surahId);
    if (!set) {
      set = new Set();
      verseNumbersBySurah.set(block.surahId, set);
    }
    for (const verse of block.verses) {
      set.add(verse.verseNumber);
    }
  }

  const irabBySurah: Record<number, IrabSurah | null> = {};
  const sensesBySurah: Record<number, WordSensesSurah | null> = {};

  await Promise.all(
    surahIds.map(async (surahId) => {
      const verses = verseNumbersBySurah.get(surahId) ?? new Set();
      const [fullIrab, fullSenses] = await Promise.all([
        getIrab(surahId),
        getWordSenses(surahId),
      ]);
      irabBySurah[surahId] = sliceIrabToVerseNumbers(fullIrab, verses);
      sensesBySurah[surahId] = sliceWordSensesToVerseNumbers(
        fullSenses,
        verses,
      );
    }),
  );

  const lexiconKeys = new Set<string>();
  for (const senses of Object.values(sensesBySurah)) {
    if (!senses) continue;
    for (const entry of Object.values(senses.words)) {
      if (entry.lexiconKey) lexiconKeys.add(entry.lexiconKey);
    }
  }
  const lexiconByKey = await resolveLexiconMap(lexiconKeys);

  return { irabBySurah, sensesBySurah, lexiconByKey };
}
