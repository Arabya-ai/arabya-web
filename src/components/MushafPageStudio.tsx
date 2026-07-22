"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  IrabSurah,
  IrabWord,
  TafsirSource,
  VerseTranslationEdition,
} from "@/lib/types";
import type { MushafPageContent } from "@/lib/mushaf";
import { formatVerseKey, toArabicNumerals } from "@/lib/format";
import { juzLabel } from "@/lib/juz";
import { normalizeForHafsFont } from "@/lib/quran-text";
import { isBookmarked, toggleBookmark } from "@/lib/bookmarks";
import { getSurahUthmaniTitle } from "@/lib/surah-names";
import { StudyModeTabs } from "@/components/StudyModeTabs";
import { makeWordId } from "@/lib/word-id";
import { RECITERS, reciterHasWordSync } from "@/lib/audio";
import { narrativeIrab } from "@/lib/irab-narrative";
import { WordStudyDock } from "@/components/WordStudyDock";
import { SurahOrnamentTitle } from "@/components/SurahOrnamentTitle";
import { getAyahNote, saveAyahNote } from "@/lib/ayah-notes";
import { useMushafPrefs } from "@/hooks/useMushafPrefs";
import { useMushafStudyCache } from "@/hooks/useMushafStudyCache";
import { useQuranAudio } from "@/hooks/useQuranAudio";
import {
  clampFontScale,
  wordMeaning,
  type WordRef,
} from "@/hooks/mushaf-utils";

type Props = {
  page: MushafPageContent;
  irabBySurah: Record<number, IrabSurah | null>;
  tafsirSources: TafsirSource[];
  verseEditions: VerseTranslationEdition[];
};

type Mode = "words" | "irab" | "meaning-table" | string;

export function MushafPageStudio({
  page,
  irabBySurah,
  tafsirSources,
  verseEditions,
}: Props) {
  const modes: { id: Mode; label: string }[] = useMemo(() => {
    const list: { id: Mode; label: string }[] = [
      { id: "words", label: "الكلمات" },
      { id: "irab", label: "الإعراب" },
      { id: "meaning-table", label: "جدول المعنى" },
    ];
    for (const s of tafsirSources) {
      list.push({ id: s.slug, label: s.nameAr });
    }
    return list;
  }, [tafsirSources]);

  const [mode, setMode] = useState<Mode>("words");
  const [activeWord, setActiveWord] = useState<WordRef | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [repeatCount, setRepeatCount] = useState(1);
  const [ayahNoteDraft, setAyahNoteDraft] = useState("");

  const prefs = useMushafPrefs(page, verseEditions);

  const irabWordMap = useMemo(() => {
    const map = new Map<string, IrabWord>();
    for (const block of page.blocks) {
      for (const verse of irabBySurah[block.surahId]?.verses ?? []) {
        for (const w of verse.words) {
          map.set(`${block.surahId}:${verse.verseNumber}:${w.position}`, w);
        }
      }
    }
    return map;
  }, [page.blocks, irabBySurah]);

  const wordRows = useMemo(
    () =>
      page.blocks.flatMap((block) =>
        block.verses.flatMap((verse) =>
          verse.words.map((word) => {
            const morph = irabWordMap.get(
              `${block.surahId}:${verse.verseNumber}:${word.position}`,
            );
            return {
              key: `${block.surahId}:${verse.verseNumber}:${word.position}`,
              wordId:
                morph?.wordId ??
                makeWordId(block.surahId, verse.verseNumber, word.position),
              surahId: block.surahId,
              verseNumber: verse.verseNumber,
              verseKey: verse.verseKey,
              word,
              morph: morph ?? null,
              irab: narrativeIrab(morph ?? null),
            };
          }),
        ),
      ),
    [page.blocks, irabWordMap],
  );

  const selected = useMemo(() => {
    if (!activeWord) return null;
    return (
      wordRows.find(
        (r) =>
          r.surahId === activeWord.surahId &&
          r.verseNumber === activeWord.verse &&
          r.word.position === activeWord.position,
      ) ?? null
    );
  }, [activeWord, wordRows]);

  const study = useMushafStudyCache({
    mode,
    page,
    verseEdition: prefs.verseEdition,
    verseEditions,
    selected,
  });

  const flashShareNote = (note: string | null, clearMs?: number) => {
    setShareNote(note);
    if (note && clearMs) {
      window.setTimeout(() => setShareNote(null), clearMs);
    }
  };

  const selectWord = (surahId: number, verse: number, position: number) => {
    setActiveWord({ surahId, verse, position });
    if (mode !== "words" && mode !== "irab") setMode("words");
  };

  const audio = useQuranAudio({
    selected,
    reciterId: prefs.reciterId,
    repeatCount,
    page,
    onHighlightWord: setActiveWord,
    onSelectWord: selectWord,
    onStatusNote: flashShareNote,
  });

  useEffect(() => {
    if (!selected && wordRows[0]) {
      setActiveWord({
        surahId: wordRows[0].surahId,
        verse: wordRows[0].verseNumber,
        position: wordRows[0].word.position,
      });
    }
  }, [selected, wordRows]);

  useEffect(() => {
    if (!selected) {
      setBookmarked(false);
      return;
    }
    setBookmarked(isBookmarked(selected.verseKey));
  }, [selected]);

  useEffect(() => {
    const key = selected?.verseKey;
    if (!key) {
      setAyahNoteDraft("");
      return;
    }
    try {
      setAyahNoteDraft(getAyahNote(key)?.text ?? "");
    } catch {
      setAyahNoteDraft("");
    }
  }, [selected?.verseKey]);

  const shareAyah = async (surahId: number, verseNumber: number) => {
    const block = page.blocks.find((b) => b.surahId === surahId);
    const verse = block?.verses.find((v) => v.verseNumber === verseNumber);
    const ayahText = verse?.words.map((w) => w.text).join(" ") ?? "";
    const url = `${window.location.origin}/mushaf/${page.page}?v=${surahId}:${verseNumber}#s${surahId}-v-${verseNumber}`;
    const shareBody = `${ayahText}\n\n${getSurahUthmaniTitle(surahId)} ${toArabicNumerals(verseNumber)}\n${url}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Arabya — ${getSurahUthmaniTitle(surahId)} ${verseNumber}`,
          text: shareBody,
          url,
        });
        setShareNote("تمت المشاركة");
      } else {
        await navigator.clipboard.writeText(shareBody);
        setShareNote("تم نسخ الآية والرابط");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setShareNote("تم نسخ الرابط");
      } catch {
        setShareNote(url);
      }
    }
    window.setTimeout(() => setShareNote(null), 2200);
  };

  const onToggleBookmark = () => {
    if (!selected) return;
    const next = toggleBookmark({
      surahId: selected.surahId,
      verse: selected.verseNumber,
      page: page.page,
      key: selected.verseKey,
    });
    setBookmarked(next.some((b) => b.key === selected.verseKey));
    setShareNote(
      next.some((b) => b.key === selected.verseKey)
        ? "أُضيفت للمفضّلات"
        : "أُزيلت من المفضّلات",
    );
    window.setTimeout(() => setShareNote(null), 1800);
  };

  const studySurahId =
    activeWord?.surahId ?? page.blocks[0]?.surahId ?? null;

  return (
    <div
      className="studio"
      style={{ ["--mushaf-scale" as string]: String(prefs.fontScale) }}
    >
      <div className="mushaf-toolbar" aria-label="أدوات المصحف">
        <div className="font-scale" role="group" aria-label="حجم خط المصحف">
          <button
            type="button"
            className="tool-btn"
            onClick={() =>
              prefs.setFontScale((s) =>
                clampFontScale(s - prefs.FONT_SCALE_STEP),
              )
            }
            disabled={!prefs.canShrink}
            aria-label="تصغير الخط"
            title="تصغير"
          >
            أ−
          </button>
          <label className="font-scale-field" htmlFor="mushaf-font-scale">
            <span className="sr-only">نسبة حجم الخط</span>
            <input
              id="mushaf-font-scale"
              name="mushaf-font-scale"
              type="number"
              inputMode="numeric"
              min={Math.round(prefs.FONT_SCALE_MIN * 100)}
              max={Math.round(prefs.FONT_SCALE_MAX * 100)}
              step={Math.round(prefs.FONT_SCALE_STEP * 100)}
              dir="ltr"
              className="font-scale-input"
              value={prefs.fontDraft}
              onChange={(e) => prefs.setFontDraft(e.target.value)}
              onBlur={prefs.commitFontDraft}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  e.preventDefault();
                  prefs.commitFontDraft();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              onKeyUp={(e) => e.stopPropagation()}
              aria-label="أدخل نسبة حجم الخط يدوياً"
              title={`اكتب رقماً من ${Math.round(prefs.FONT_SCALE_MIN * 100)} إلى ${Math.round(prefs.FONT_SCALE_MAX * 100)} ثم Enter`}
            />
            <span className="font-scale-suffix" aria-hidden>
              %
            </span>
          </label>
          <button
            type="button"
            className="tool-btn"
            onClick={() =>
              prefs.setFontScale((s) =>
                clampFontScale(s + prefs.FONT_SCALE_STEP),
              )
            }
            disabled={!prefs.canGrow}
            aria-label="تكبير الخط"
            title="تكبير"
          >
            أ+
          </button>
        </div>
        {studySurahId ? (
          <Link
            href={`/surah/${studySurahId}/read`}
            className="tool-btn"
            title="دراسة السورة مع خيارات الإعراب والدراسة السريعة"
          >
            دراسة السورة
          </Link>
        ) : null}
        {selected ? (
          <Link
            href={`/ayah/${selected.surahId}/${selected.verseNumber}`}
            className="tool-btn"
            title="صفحة إعراب الآية كلمة بكلمة"
          >
            إعراب الآية
          </Link>
        ) : null}
        {selected?.morph?.root ? (
          <Link
            href={`/root/${encodeURIComponent(selected.morph.root)}`}
            className="tool-btn"
            title="مواضع الجذر في القرآن"
          >
            الجذر
          </Link>
        ) : null}
        {selected ? (
          <>
            <label className="reciter-pick">
              <span className="sr-only">القارئ</span>
              <select
                className="reciter-select"
                value={prefs.reciterId}
                onChange={(e) => {
                  prefs.persistReciterId(e.target.value);
                  audio.stopAllAudio();
                }}
                aria-label="اختر القارئ"
                title="القارئ"
              >
                {RECITERS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nameAr}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={`tool-btn bookmark-btn ${bookmarked ? "is-on" : ""}`}
              onClick={onToggleBookmark}
              aria-pressed={bookmarked}
            >
              {bookmarked ? "★ مفضّلة" : "☆ حفظ الآية"}
            </button>
            <label className="repeat-pick">
              <span className="sr-only">تكرار التلاوة</span>
              <select
                className="reciter-select"
                value={repeatCount}
                onChange={(e) => setRepeatCount(Number(e.target.value))}
                aria-label="عدد مرات تكرار الآية"
                title="تكرار الآية"
              >
                {[1, 2, 3, 5, 7, 10].map((n) => (
                  <option key={n} value={n}>
                    ×{toArabicNumerals(n)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={`tool-btn ${audio.audioPlaying ? "is-on" : ""}`}
              onClick={audio.playAyahAudio}
              aria-pressed={audio.audioPlaying}
              title={
                reciterHasWordSync(prefs.reciterId)
                  ? "تلاوة الآية مع تمييز الكلمات"
                  : "تلاوة الآية (تمييز الكلمات غير متاح لهذا القارئ — جرّب العفاسي)"
              }
            >
              {audio.audioPlaying ? "⏸ إيقاف" : "▶ آية"}
            </button>
            <button
              type="button"
              className={`tool-btn ${audio.wbwPlaying ? "is-on" : ""}`}
              onClick={audio.playWordByWordAudio}
              aria-pressed={audio.wbwPlaying}
              title="تلاوة كلمة بكلمة مع تمييز الكلمة"
            >
              {audio.wbwPlaying ? "⏸ إيقاف" : "▶ كلمات"}
            </button>
          </>
        ) : null}
        {shareNote ? <span className="share-note">{shareNote}</span> : null}
      </div>

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
                        audio.audioPlaying &&
                        selected?.surahId === block.surahId &&
                        selected?.verseNumber === verse.verseNumber &&
                        audio.syncHighlightPos === word.position;
                      const text = normalizeForHafsFont(word.text.trim());
                      const isLast = wi === verse.words.length - 1;
                      const button = (
                        <button
                          type="button"
                          className={`mushaf-word ${isActive ? "is-selected" : ""} ${isSync ? "is-sync" : ""}`}
                          aria-pressed={isActive}
                          title={wordMeaning(word, prefs.meaningLang) || text}
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

      {selected ? (
        <>
          <WordStudyDock
            verseKey={selected.verseKey}
            word={selected.word}
            morph={selected.morph}
            meaningLang={prefs.meaningLang}
            onMeaningLang={prefs.setMeaningLang}
            verseEditions={verseEditions}
            verseEdition={prefs.verseEdition}
            onVerseEdition={prefs.setVerseEdition}
            verseTranslation={study.selectedVerseTranslation}
            tafsirSources={tafsirSources}
          />
          <div className="ayah-note-panel">
            <label className="ayah-note-label" htmlFor="ayah-note">
              ملاحظة على الآية {formatVerseKey(selected.verseKey)}
            </label>
            <textarea
              id="ayah-note"
              className="ayah-note-input"
              rows={3}
              maxLength={4000}
              value={ayahNoteDraft}
              placeholder="اكتب ملاحظة محلية تُحفظ في هذا الجهاز…"
              onChange={(e) => setAyahNoteDraft(e.target.value)}
              onBlur={() => {
                try {
                  saveAyahNote({
                    key: selected.verseKey,
                    surahId: selected.surahId,
                    verse: selected.verseNumber,
                    text: ayahNoteDraft,
                  });
                } catch {
                  /* ignore quota */
                }
              }}
            />
          </div>
        </>
      ) : null}

      <StudyModeTabs modes={modes} mode={mode} onModeChange={setMode} />

      {mode === "words" || mode === "irab" ? (
        <section
          className="study-sheet"
          role="tabpanel"
          id="study-panel"
          aria-labelledby={`study-tab-${mode}`}
          tabIndex={0}
        >
          <h2>
            {mode === "words"
              ? `كلمات صفحة ${toArabicNumerals(page.page)}`
              : `إعراب صفحة ${toArabicNumerals(page.page)}`}
          </h2>

          <div className="table-wrap desktop-only">
            <table className="study-table">
              <thead>
                <tr>
                  <th>رقم</th>
                  <th>الكلمة</th>
                  <th>{mode === "irab" ? "الإعراب" : "المعنى"}</th>
                </tr>
              </thead>
              <tbody>
                {wordRows.map((row, idx) => {
                  const open = selected?.key === row.key;
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
                          : wordMeaning(row.word, prefs.meaningLang) || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="word-cards mobile-only">
            {wordRows.map((row, idx) => {
              const open = selected?.key === row.key;
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
                      : wordMeaning(row.word, prefs.meaningLang) || "—"}
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
          id="study-panel"
          aria-labelledby={`study-tab-${mode}`}
          tabIndex={0}
        >
          <h2>جدول المعنى العربي — صفحة {toArabicNumerals(page.page)}</h2>
          <p className="table-intro">معاني الكلمات كلمة بكلمة</p>
          <div className="meaning-table-grid">
            {wordRows.map((row) => {
              const open = selected?.key === row.key;
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
                  <span className="meaning-table-gloss">
                    {row.word.meaningAr ||
                      row.morph?.lemma ||
                      row.word.meaning ||
                      "—"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {study.activeTafsir ? (
        <section
          className="study-sheet"
          role="tabpanel"
          id="study-panel"
          aria-labelledby={`study-tab-${mode}`}
          tabIndex={0}
        >
          <h2>
            {tafsirSources.find((s) => s.slug === study.activeTafsir)?.nameAr ??
              "التفسير"}
          </h2>
          {study.tafsirLoading && !study.tafsirRows.length ? (
            <p className="table-intro">جارٍ تحميل التفسير…</p>
          ) : !study.tafsirRows.length ? (
            <p className="table-intro">بيانات هذا التفسير غير متوفرة حاليًا.</p>
          ) : (
            <div className="tafsir-list">
              {study.tafsirRows.map((v) => (
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
    </div>
  );
}
