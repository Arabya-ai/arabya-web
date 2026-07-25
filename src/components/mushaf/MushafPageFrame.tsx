"use client";

import { SurahOrnamentTitle } from "@/components/SurahOrnamentTitle";
import { formatVerseKey, toArabicNumerals } from "@/lib/format";
import { juzLabel } from "@/lib/juz";
import type { MushafPageContent } from "@/lib/mushaf";
import { normalizeForHafsFont } from "@/lib/quran-text";
import { getSurahUthmaniTitle } from "@/lib/surah-names";
import type { WordRef } from "@/hooks/mushaf-utils";
import { wordMeaning, type MeaningLang } from "@/hooks/mushaf-utils";

type Props = {
  page: MushafPageContent;
  activeWord: WordRef | null;
  meaningLang: MeaningLang;
  selectWord: (surahId: number, verse: number, position: number) => void;
  shareAyah: (surahId: number, verseNumber: number) => void;
  audioPlaying: boolean;
  syncHighlightPos: number | null;
  selectedSurahId: number | null;
  selectedVerseNumber: number | null;
};

export function MushafPageFrame({
  page,
  activeWord,
  meaningLang,
  selectWord,
  shareAyah,
  audioPlaying,
  syncHighlightPos,
  selectedSurahId,
  selectedVerseNumber,
}: Props) {
  return (
    <article className="mushaf-page" aria-label={`مصحف — صفحة ${page.page}`}>
      <div className="mushaf-frame">
        <header className="mushaf-banner">
          <div className="mushaf-banner-top">
            <p className="mushaf-madinah-label">مُصْحَفُ المَدِينَةِ</p>
            <p className="mushaf-banner-meta">
              {juzLabel(page.juz)} · صفحة {toArabicNumerals(page.page)} من{" "}
              {toArabicNumerals(page.totalPages)}
            </p>
          </div>
          {page.blocks.length === 1 ? (
            <SurahOrnamentTitle
              className="surah-ornament--full"
              title={getSurahUthmaniTitle(page.blocks[0].surahId)}
            />
          ) : null}
        </header>

        {page.blocks.map((block) => (
          <section key={block.surahId} className="mushaf-surah-block">
            {page.blocks.length > 1 ? (
              <SurahOrnamentTitle
                as="h2"
                className="surah-ornament--full surah-ornament--compact"
                title={getSurahUthmaniTitle(block.surahId)}
              />
            ) : null}

            <div
              className="mushaf-text"
              aria-label="نص المصحف — اضغط أي كلمة"
            >
              {block.verses.map((verse) => (
                <span
                  key={verse.verseKey}
                  className="mushaf-ayah"
                  id={`s${block.surahId}-v-${verse.verseNumber}`}
                >
                  {verse.words.map((word, wi) => {
                    const isActive =
                      activeWord?.surahId === block.surahId &&
                      activeWord?.verse === verse.verseNumber &&
                      activeWord?.position === word.position;
                    const isSync =
                      audioPlaying &&
                      selectedSurahId === block.surahId &&
                      selectedVerseNumber === verse.verseNumber &&
                      syncHighlightPos === word.position;
                    const text = normalizeForHafsFont(word.text.trim());
                    const isLast = wi === verse.words.length - 1;
                    const button = (
                      <button
                        type="button"
                        className={`mushaf-word ${isActive ? "is-selected" : ""} ${isSync ? "is-sync" : ""}`}
                        aria-pressed={isActive}
                        title={wordMeaning(word, meaningLang) || text}
                        onClick={() =>
                          selectWord(
                            block.surahId,
                            verse.verseNumber,
                            word.position,
                          )
                        }
                      >
                        {text}
                      </button>
                    );
                    if (isLast) {
                      return (
                        <span
                          key={`${block.surahId}-${verse.verseNumber}-${word.position}`}
                          className="ayah-tail"
                        >
                          {wi > 0 ? "\u00A0" : null}
                          {button}
                          <button
                            type="button"
                            className="ayah-end"
                            title="مشاركة الآية"
                            onClick={() =>
                              shareAyah(block.surahId, verse.verseNumber)
                            }
                          >
                            {toArabicNumerals(verse.verseNumber)}
                          </button>
                        </span>
                      );
                    }
                    return (
                      <span
                        key={`${block.surahId}-${verse.verseNumber}-${word.position}`}
                      >
                        {wi > 0 ? "\u00A0" : null}
                        {button}
                      </span>
                    );
                  })}
                </span>
              ))}
            </div>
          </section>
        ))}

        <p className="mushaf-hint">
          اضغط أي كلمة للدراسة · من اللوحة: إعراب الآية / الجذر · رقم الآية
          للمشاركة · ▶ للتلاوة · ←→ لتقليب الصفحات
        </p>
      </div>
    </article>
  );
}

/** Re-export for callers that only need the key formatter nearby. */
export { formatVerseKey };
