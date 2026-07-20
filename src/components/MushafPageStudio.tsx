"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  IrabSurah,
  TafsirSource,
  TafsirSurah,
  VerseTranslationEdition,
  VerseTranslationSurah,
  QuranWord,
} from "@/lib/types";
import type { MushafPageContent } from "@/lib/mushaf";
import { formatVerseKey, toArabicNumerals } from "@/lib/format";
import { juzLabel } from "@/lib/juz";
import { normalizeForHafsFont } from "@/lib/quran-text";
import { isBookmarked, toggleBookmark } from "@/lib/bookmarks";
import { getSurahUthmaniTitle } from "@/lib/surah-names";

type Props = {
  page: MushafPageContent;
  irabBySurah: Record<number, IrabSurah | null>;
  tafsirSources: TafsirSource[];
  verseEditions: VerseTranslationEdition[];
};

type Mode = "words" | "irab" | string;
type WordRef = { surahId: number; verse: number; position: number };
type MeaningLang = "en" | "id" | "ur";

const FONT_KEY = "arabya-mushaf-font";
const LAST_PAGE_KEY = "arabya-last-mushaf-page";
const MEANING_LANG_KEY = "arabya-meaning-lang";
const VERSE_TRANS_KEY = "arabya-verse-trans";

function wordMeaning(word: QuranWord, lang: MeaningLang): string {
  if (lang === "id") return word.meaningId || word.meaning || "";
  if (lang === "ur") return word.meaningUr || word.meaning || "";
  return word.meaning || "";
}

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
    ];
    for (const s of tafsirSources) {
      list.push({ id: s.slug, label: s.nameAr });
    }
    return list;
  }, [tafsirSources]);

  const [mode, setMode] = useState<Mode>("words");
  const [activeWord, setActiveWord] = useState<WordRef | null>(null);
  const [fontScale, setFontScale] = useState(1);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [meaningLang, setMeaningLang] = useState<MeaningLang>("en");
  const [verseEdition, setVerseEdition] = useState(
    () => verseEditions[0]?.slug ?? "saheeh-en",
  );
  const [bookmarked, setBookmarked] = useState(false);
  const [tafsirCache, setTafsirCache] = useState<
    Record<string, TafsirSurah | null>
  >({});
  const [transCache, setTransCache] = useState<
    Record<string, VerseTranslationSurah | null>
  >({});
  const [tafsirLoading, setTafsirLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(FONT_KEY));
      if (saved >= 0.85 && saved <= 1.35) setFontScale(saved);
      const lang = localStorage.getItem(MEANING_LANG_KEY);
      if (lang === "en" || lang === "id" || lang === "ur") setMeaningLang(lang);
      const ed = localStorage.getItem(VERSE_TRANS_KEY);
      if (ed && verseEditions.some((e) => e.slug === ed)) setVerseEdition(ed);
    } catch {
      /* ignore */
    }
  }, [verseEditions]);

  useEffect(() => {
    try {
      localStorage.setItem(LAST_PAGE_KEY, String(page.page));
      localStorage.setItem(FONT_KEY, String(fontScale));
      localStorage.setItem(MEANING_LANG_KEY, meaningLang);
      localStorage.setItem(VERSE_TRANS_KEY, verseEdition);
    } catch {
      /* ignore */
    }
  }, [page.page, fontScale, meaningLang, verseEdition]);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#s")) return;
    const el = document.querySelector(hash);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [page.page]);

  const irabMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const block of page.blocks) {
      for (const verse of irabBySurah[block.surahId]?.verses ?? []) {
        for (const w of verse.words) {
          map.set(`${block.surahId}:${verse.verseNumber}:${w.position}`, w.irab);
        }
      }
    }
    return map;
  }, [page.blocks, irabBySurah]);

  const wordRows = useMemo(
    () =>
      page.blocks.flatMap((block) =>
        block.verses.flatMap((verse) =>
          verse.words.map((word) => ({
            key: `${block.surahId}:${verse.verseNumber}:${word.position}`,
            surahId: block.surahId,
            verseNumber: verse.verseNumber,
            verseKey: verse.verseKey,
            word,
            irab:
              irabMap.get(
                `${block.surahId}:${verse.verseNumber}:${word.position}`,
              ) ?? "—",
          })),
        ),
      ),
    [page.blocks, irabMap],
  );

  const pageVerseKeys = useMemo(
    () => new Set(page.blocks.flatMap((b) => b.verses.map((v) => v.verseKey))),
    [page.blocks],
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

  const activeTafsir =
    mode !== "words" && mode !== "irab" ? mode : null;

  useEffect(() => {
    if (!activeTafsir) return;

    const surahIds = [...new Set(page.blocks.map((b) => b.surahId))];
    let cancelled = false;

    (async () => {
      const toFetch = surahIds.filter(
        (id) => tafsirCache[`${activeTafsir}:${id}`] === undefined,
      );
      if (!toFetch.length) return;

      setTafsirLoading(true);
      const entries = await Promise.all(
        toFetch.map(async (surahId) => {
          try {
            const res = await fetch(`/api/tafsir/${activeTafsir}/${surahId}`);
            if (!res.ok) return [`${activeTafsir}:${surahId}`, null] as const;
            const data = (await res.json()) as TafsirSurah;
            return [`${activeTafsir}:${surahId}`, data] as const;
          } catch {
            return [`${activeTafsir}:${surahId}`, null] as const;
          }
        }),
      );
      if (cancelled) return;
      setTafsirCache((prev) => {
        const next = { ...prev };
        for (const [key, value] of entries) next[key] = value;
        return next;
      });
      setTafsirLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTafsir, page.page]);

  useEffect(() => {
    if (!verseEdition || !verseEditions.length) return;
    const surahIds = [...new Set(page.blocks.map((b) => b.surahId))];
    let cancelled = false;

    (async () => {
      const toFetch = surahIds.filter(
        (id) => transCache[`${verseEdition}:${id}`] === undefined,
      );
      if (!toFetch.length) return;

      const entries = await Promise.all(
        toFetch.map(async (surahId) => {
          try {
            const res = await fetch(
              `/api/translation/${verseEdition}/${surahId}`,
            );
            if (!res.ok) return [`${verseEdition}:${surahId}`, null] as const;
            const data = (await res.json()) as VerseTranslationSurah;
            return [`${verseEdition}:${surahId}`, data] as const;
          } catch {
            return [`${verseEdition}:${surahId}`, null] as const;
          }
        }),
      );
      if (cancelled) return;
      setTransCache((prev) => {
        const next = { ...prev };
        for (const [key, value] of entries) next[key] = value;
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verseEdition, page.page, verseEditions.length]);

  const tafsirRows = useMemo(() => {
    if (!activeTafsir) return [];
    return page.blocks.flatMap((block) => {
      const tafsir = tafsirCache[`${activeTafsir}:${block.surahId}`];
      if (!tafsir) return [];
      return tafsir.verses
        .filter((v) => pageVerseKeys.has(v.verseKey))
        .map((v) => ({
          ...v,
          surahId: block.surahId,
          words:
            block.verses.find((x) => x.verseNumber === v.verseNumber)?.words ??
            [],
        }));
    });
  }, [activeTafsir, page.blocks, pageVerseKeys, tafsirCache]);

  const selectedVerseTranslation = useMemo(() => {
    if (!selected) return null;
    const pack = transCache[`${verseEdition}:${selected.surahId}`];
    return (
      pack?.verses.find((v) => v.verseNumber === selected.verseNumber)?.text ??
      null
    );
  }, [selected, transCache, verseEdition]);

  const selectWord = (surahId: number, verse: number, position: number) => {
    setActiveWord({ surahId, verse, position });
    if (mode !== "words" && mode !== "irab") setMode("words");
  };

  const shareAyah = async (surahId: number, verseNumber: number) => {
    const block = page.blocks.find((b) => b.surahId === surahId);
    const verse = block?.verses.find((v) => v.verseNumber === verseNumber);
    const ayahText = verse?.words.map((w) => w.text).join(" ") ?? "";
    const url = `${window.location.origin}/mushaf/${page.page}#s${surahId}-v-${verseNumber}`;
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

  const meaningLabels: { id: MeaningLang; label: string }[] = [
    { id: "en", label: "EN" },
    { id: "id", label: "ID" },
    { id: "ur", label: "UR" },
  ];

  return (
    <div className="studio">
      <div className="mushaf-toolbar" aria-label="أدوات المصحف">
        <div className="font-scale" role="group" aria-label="حجم الخط">
          <button
            type="button"
            className="tool-btn"
            onClick={() =>
              setFontScale((s) => Math.max(0.85, +(s - 0.1).toFixed(2)))
            }
            aria-label="تصغير الخط"
          >
            أ−
          </button>
          <span className="font-scale-label">{Math.round(fontScale * 100)}٪</span>
          <button
            type="button"
            className="tool-btn"
            onClick={() =>
              setFontScale((s) => Math.min(1.35, +(s + 0.1).toFixed(2)))
            }
            aria-label="تكبير الخط"
          >
            أ+
          </button>
        </div>
        {selected ? (
          <button
            type="button"
            className={`tool-btn bookmark-btn ${bookmarked ? "is-on" : ""}`}
            onClick={onToggleBookmark}
            aria-pressed={bookmarked}
          >
            {bookmarked ? "★ مفضّلة" : "☆ حفظ الآية"}
          </button>
        ) : null}
        {shareNote ? <span className="share-note">{shareNote}</span> : null}
      </div>

      <article className="mushaf-page" aria-label={`مصحف — صفحة ${page.page}`}>
        <div className="mushaf-frame">
          <header className="mushaf-banner">
            <p className="mushaf-banner-meta">
              {juzLabel(page.juz)} · صفحة {toArabicNumerals(page.page)} من{" "}
              {toArabicNumerals(page.totalPages)}
            </p>
            <h1 className="mushaf-sura-name mushaf-page-title">
              {page.blocks.length === 1
                ? getSurahUthmaniTitle(page.blocks[0].surahId)
                : "مُصْحَفُ المَدِينَةِ"}
            </h1>
          </header>

          {page.blocks.map((block) => (
            <section key={block.surahId} className="mushaf-surah-block">
              {page.blocks.length > 1 ? (
                <h2 className="mushaf-surah-inline">
                  {getSurahUthmaniTitle(block.surahId)}
                </h2>
              ) : null}

              <div
                className="mushaf-text"
                style={{
                  fontSize: `calc(clamp(1.55rem, 3.8vw + 0.5rem, 2.25rem) * ${fontScale})`,
                }}
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
                      const text = normalizeForHafsFont(word.text.trim());
                      const isLast = wi === verse.words.length - 1;
                      const button = (
                        <button
                          type="button"
                          className={`mushaf-word ${isActive ? "is-selected" : ""}`}
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
            اضغط أي كلمة لدراستها · رقم الآية للمشاركة · ★ لحفظ المفضّلة
          </p>
        </div>
      </article>

      {selected ? (
        <section className="word-dock" aria-live="polite">
          <div className="word-dock-main">
            <span className="word-dock-key">
              {formatVerseKey(selected.verseKey)}
            </span>
            <p className="word-dock-ar">
              {normalizeForHafsFont(selected.word.text)}
            </p>
            {selected.word.transliteration ? (
              <p className="word-dock-tr">{selected.word.transliteration}</p>
            ) : null}
            <p className="word-dock-en">
              {wordMeaning(selected.word, meaningLang) || "—"}
            </p>
          </div>
          <div className="analysis-grid analysis-grid--two">
            <article className="analysis-card is-ready">
              <h3>الإعراب / الصرف</h3>
              <p>{selected.irab}</p>
              <p className="analysis-note">
                من المدونة القرآنية العربية (Quranic Arabic Corpus) — GPL
              </p>
            </article>
            <article className="analysis-card is-ready">
              <h3>معنى الكلمة</h3>
              <div className="lang-switch" role="group" aria-label="لغة المعنى">
                {meaningLabels.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className={`lang-chip ${meaningLang === l.id ? "is-active" : ""}`}
                    onClick={() => setMeaningLang(l.id)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <p>{wordMeaning(selected.word, meaningLang) || "—"}</p>
              <p className="analysis-note">
                كلمة بكلمة من Quran.com (إنجليزي / إندونيسي / أردو). لا يتوفر
                حالياً مصدر عربي مفتوح لمعاني الكلمات.
              </p>
            </article>
          </div>
          {verseEditions.length ? (
            <article className="analysis-card is-ready verse-trans-card">
              <div className="verse-trans-head">
                <h3>ترجمة الآية</h3>
                <select
                  className="verse-trans-select"
                  value={verseEdition}
                  onChange={(e) => setVerseEdition(e.target.value)}
                  aria-label="اختر ترجمة الآية"
                >
                  {verseEditions.map((e) => (
                    <option key={e.slug} value={e.slug}>
                      {e.nameAr}
                    </option>
                  ))}
                </select>
              </div>
              <p className="verse-trans-body" dir="auto">
                {selectedVerseTranslation || "جارٍ التحميل…"}
              </p>
            </article>
          ) : null}
        </section>
      ) : null}

      <div className="mode-rail" role="tablist" aria-label="طريقة الدراسة">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            className={`mode-chip ${mode === m.id ? "is-active" : ""}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "words" || mode === "irab" ? (
        <section className="study-sheet">
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
                      : wordMeaning(row.word, meaningLang) || "—"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="study-sheet">
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
      )}
    </div>
  );
}
