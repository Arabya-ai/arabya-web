"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MeaningLangSwitch } from "@/components/MeaningLangSwitch";
import { StudyModeTabs } from "@/components/StudyModeTabs";
import { formatVerseKey, toArabicNumerals } from "@/lib/format";
import { normalizeForHafsFont } from "@/lib/quran-text";
import type { QuranWord, TafsirSource } from "@/lib/types";
import { tafsirDisplayName } from "@/lib/tafsir-label";
import {
  wordMeaning,
  type MeaningLang,
  type WordRef,
} from "@/hooks/mushaf-utils";

export type MushafWordRow = {
  key: string;
  wordId: string;
  surahId: number;
  verseNumber: number;
  verseKey: string;
  word: QuranWord;
  morph: { lemma?: string | null } | null;
  irab: string;
};

type Mode = "words" | "irab" | "meaning-table" | string;

type TafsirRow = {
  verseKey: string;
  surahId: number;
  verseNumber: number;
  text: string;
  words: QuranWord[];
};

type Props = {
  pageNumber: number;
  modes: { id: Mode; label: string }[];
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  meaningLang: MeaningLang;
  onMeaningLang: (lang: MeaningLang) => void;
  wordRows: MushafWordRow[];
  selectedKey: string | null;
  activeWord: WordRef | null;
  selectWord: (surahId: number, verse: number, position: number) => void;
  activeTafsir: string | null;
  tafsirSources: TafsirSource[];
  tafsirLoading: boolean;
  tafsirRows: TafsirRow[];
};

function formatPageNum(page: number, locale: string): string {
  return locale === "ar" ? toArabicNumerals(page) : String(page);
}

export function MushafStudySheets({
  pageNumber,
  modes,
  mode,
  onModeChange,
  meaningLang,
  onMeaningLang,
  wordRows,
  selectedKey,
  activeWord,
  selectWord,
  activeTafsir,
  tafsirSources,
  tafsirLoading,
  tafsirRows,
}: Props) {
  const locale = useLocale();
  const tModes = useTranslations("Mushaf.modes");
  const t = useTranslations("Mushaf.sheets");
  const pageLabel = formatPageNum(pageNumber, locale);

  return (
    <>
      <p className="study-modes-hint">
        <strong>{tModes("hintStrong1")}</strong> {tModes("hintRest")}{" "}
        <strong>{tModes("hintStrong2")}</strong> {tModes("hintRest2")}
      </p>
      <StudyModeTabs
        modes={modes}
        mode={mode}
        onModeChange={onModeChange}
        panelId={`study-panel-${mode}`}
        ariaLabel={tModes("aria")}
      />

      {mode === "words" || mode === "irab" ? (
        <section
          className="study-sheet"
          role="tabpanel"
          id={`study-panel-${mode}`}
          aria-labelledby={`study-tab-${mode}`}
          tabIndex={0}
        >
          <h2>
            {mode === "words"
              ? t("wordsPageTitle", { page: pageLabel })
              : t("irabPageTitle", { page: pageLabel })}
          </h2>

          {mode === "words" ? (
            <MeaningLangSwitch
              value={meaningLang}
              onChange={onMeaningLang}
              idPrefix="page-words-meaning"
              note={t("wordsMeaningNote")}
            />
          ) : null}

          <div className="table-wrap desktop-only">
            <table className="study-table">
              <thead>
                <tr>
                  <th>{t("tableNum")}</th>
                  <th>{t("tableWord")}</th>
                  <th>{mode === "irab" ? t("tableIrab") : t("tableTranslation")}</th>
                </tr>
              </thead>
              <tbody>
                {wordRows.map((row, idx) => {
                  const open = selectedKey === row.key;
                  return (
                    <tr
                      key={row.key}
                      className={open ? "is-open" : undefined}
                      onClick={() =>
                        selectWord(
                          row.surahId,
                          row.verseNumber,
                          row.word.position,
                        )
                      }
                    >
                      <td>{formatPageNum(idx + 1, locale)}</td>
                      <td className="cell-word">
                        {normalizeForHafsFont(row.word.text)}
                      </td>
                      <td className="cell-meaning">
                        {mode === "irab"
                          ? row.irab
                          : wordMeaning(row.word, meaningLang) || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="word-cards mobile-only">
            {wordRows.map((row, idx) => {
              const open = selectedKey === row.key;
              return (
                <button
                  key={row.key}
                  type="button"
                  className={`word-card ${open ? "is-selected" : ""}`}
                  onClick={() =>
                    selectWord(row.surahId, row.verseNumber, row.word.position)
                  }
                >
                  <span className="word-card-idx">
                    {formatPageNum(idx + 1, locale)}
                  </span>
                  <span className="word-card-ar">
                    {normalizeForHafsFont(row.word.text)}
                  </span>
                  <span className="word-card-meta">
                    {mode === "irab"
                      ? row.irab
                      : wordMeaning(row.word, meaningLang) || "—"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {mode === "meaning-table" ? (
        <section
          className="study-sheet meaning-table-sheet"
          role="tabpanel"
          id={`study-panel-${mode}`}
          aria-labelledby={`study-tab-${mode}`}
          tabIndex={0}
        >
          <h2>{t("meaningTableTitle", { page: pageLabel })}</h2>
          <p className="table-intro">{t("meaningTableIntro")}</p>
          <div className="meaning-table-grid">
            {wordRows.map((row) => {
              const open = selectedKey === row.key;
              const glossAr = row.word.meaningAr?.trim();
              const glossEn = row.word.meaning?.trim();
              const lemmaFallback = row.morph?.lemma?.trim();
              let glossNode: ReactNode;
              if (glossAr) {
                glossNode = glossAr;
              } else if (glossEn) {
                glossNode = glossEn;
              } else if (lemmaFallback) {
                glossNode = (
                  <span className="meaning-table-fallback">
                    ({lemmaFallback})
                    <span className="meaning-table-fallback-tag">
                      {t("meaningTableLemmaTag")}
                    </span>
                  </span>
                );
              } else {
                glossNode = "—";
              }
              return (
                <button
                  key={row.key}
                  type="button"
                  className={`meaning-table-row ${open ? "is-selected" : ""}`}
                  onClick={() =>
                    selectWord(row.surahId, row.verseNumber, row.word.position)
                  }
                >
                  <span className="meaning-table-word">
                    {normalizeForHafsFont(row.word.text)}
                  </span>
                  <span className="meaning-table-gloss">{glossNode}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeTafsir ? (
        <section
          className="study-sheet"
          role="tabpanel"
          id={`study-panel-${mode}`}
          aria-labelledby={`study-tab-${mode}`}
          tabIndex={0}
        >
          <h2>
            {(() => {
              const src = tafsirSources.find((s) => s.slug === activeTafsir);
              return src
                ? tafsirDisplayName(src, locale)
                : t("tafsirDefault");
            })()}
          </h2>
          {tafsirLoading && !tafsirRows.length ? (
            <p className="table-intro">{t("tafsirLoading")}</p>
          ) : !tafsirRows.length ? (
            <p className="table-intro">{t("tafsirEmpty")}</p>
          ) : (
            <div className="tafsir-list">
              {tafsirRows.map((v) => (
                <article key={v.verseKey} className="tafsir-ayah">
                  <header className="tafsir-head">
                    <span className="ayah-badge">
                      {formatVerseKey(v.verseKey, locale)}
                    </span>
                    <div className="tafsir-words">
                      {v.words.map((w) => {
                        const isActive =
                          activeWord?.surahId === v.surahId &&
                          activeWord?.verse === v.verseNumber &&
                          activeWord?.position === w.position;
                        return (
                          <button
                            key={`${v.surahId}-${v.verseNumber}-${w.position}`}
                            type="button"
                            className={`mushaf-word inline ${isActive ? "is-selected" : ""}`}
                            onClick={() =>
                              selectWord(v.surahId, v.verseNumber, w.position)
                            }
                          >
                            {normalizeForHafsFont(w.text)}
                          </button>
                        );
                      })}
                    </div>
                  </header>
                  <p
                    className="tafsir-body"
                    dir={
                      tafsirSources.find((s) => s.slug === activeTafsir)
                        ?.lang === "en"
                        ? "ltr"
                        : "rtl"
                    }
                    lang={
                      tafsirSources.find((s) => s.slug === activeTafsir)
                        ?.lang === "en"
                        ? "en"
                        : "ar"
                    }
                  >
                    {v.text}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
