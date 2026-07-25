"use client";

import type { ReactNode } from "react";
import { MeaningLangSwitch } from "@/components/MeaningLangSwitch";
import { StudyModeTabs } from "@/components/StudyModeTabs";
import { formatVerseKey, toArabicNumerals } from "@/lib/format";
import { normalizeForHafsFont } from "@/lib/quran-text";
import type { QuranWord, TafsirSource } from "@/lib/types";
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
  return (
    <>
      <p className="study-modes-hint">
        <strong>أوضاع الصفحة</strong> أدناه (كلمات · إعراب · جدول معنى · تفاسير)
        تعرض محتوى الصفحة كاملة.{" "}
        <strong>طبقات الكلمة</strong> في اللوحة أعلاه تخص الكلمة المحددة فقط —
        ومنها «تفسير الآية» للآية الحالية دون خلط مع تفسير الصفحة.
      </p>
      <StudyModeTabs
        modes={modes}
        mode={mode}
        onModeChange={onModeChange}
        panelId={`study-panel-${mode}`}
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
              ? `كلمات صفحة ${toArabicNumerals(pageNumber)}`
              : `إعراب صفحة ${toArabicNumerals(pageNumber)}`}
          </h2>

          {mode === "words" ? (
            <MeaningLangSwitch
              value={meaningLang}
              onChange={onMeaningLang}
              idPrefix="page-words-meaning"
              note="تغيير اللغة يحدّث عمود الترجمة في هذا الجدول، ويتزامن مع تبويب الترجمة في لوحة دراسة الكلمة."
            />
          ) : null}

          <div className="table-wrap desktop-only">
            <table className="study-table">
              <thead>
                <tr>
                  <th>رقم</th>
                  <th>الكلمة</th>
                  <th>{mode === "irab" ? "الإعراب" : "الترجمة"}</th>
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
                      <td>{toArabicNumerals(idx + 1)}</td>
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
                    {toArabicNumerals(idx + 1)}
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
          <h2>جدول المعنى العربي — صفحة {toArabicNumerals(pageNumber)}</h2>
          <p className="table-intro">
            معنى دراسي للكلمة عند توفره؛ إن ظهر اسم المادة بين قوسين فهو بديل
            صرفي وليس ترجمة.
          </p>
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
                    <span className="meaning-table-fallback-tag">مادة</span>
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
            {tafsirSources.find((s) => s.slug === activeTafsir)?.nameAr ??
              "التفسير"}
          </h2>
          {tafsirLoading && !tafsirRows.length ? (
            <p className="table-intro">جارٍ تحميل التفسير…</p>
          ) : !tafsirRows.length ? (
            <p className="table-intro">بيانات هذا التفسير غير متوفرة حاليًا.</p>
          ) : (
            <div className="tafsir-list">
              {tafsirRows.map((v) => (
                <article key={v.verseKey} className="tafsir-ayah">
                  <header className="tafsir-head">
                    <span className="ayah-badge">
                      {formatVerseKey(v.verseKey)}
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
                  <p className="tafsir-body">{v.text}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
