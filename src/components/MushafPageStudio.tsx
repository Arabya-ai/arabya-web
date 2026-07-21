"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  IrabSurah,
  IrabWord,
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
import { StudyModeTabs } from "@/components/StudyModeTabs";
import { makeWordId } from "@/lib/word-id";
import { ayahAudioUrl, wordAudioUrl, RECITERS, DEFAULT_RECITER_ID, getReciter, type VerseTiming } from "@/lib/audio";
import { narrativeIrab } from "@/lib/irab-narrative";
import { WordStudyDock } from "@/components/WordStudyDock";
import { SurahOrnamentTitle } from "@/components/SurahOrnamentTitle";
import { recordPageRead } from "@/lib/reading-habit";
import { getAyahNote, saveAyahNote } from "@/lib/ayah-notes";

type Props = {
  page: MushafPageContent;
  irabBySurah: Record<number, IrabSurah | null>;
  tafsirSources: TafsirSource[];
  verseEditions: VerseTranslationEdition[];
};

type Mode = "words" | "irab" | "meaning-table" | string;
type WordRef = { surahId: number; verse: number; position: number };
type MeaningLang = "ar" | "en" | "id" | "ur";

const FONT_KEY = "arabya-mushaf-font";
const LAST_PAGE_KEY = "arabya-last-mushaf-page";
const MEANING_LANG_KEY = "arabya-meaning-lang";
const VERSE_TRANS_KEY = "arabya-verse-trans";
const RECITER_KEY = "arabya-reciter";

const FONT_SCALE_MIN = 0.7;
const FONT_SCALE_MAX = 1.6;
const FONT_SCALE_STEP = 0.1;

function clampFontScale(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, rounded));
}

function wordMeaning(word: QuranWord, lang: MeaningLang): string {
  if (lang === "ar") return word.meaningAr || word.meaning || "";
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
      { id: "meaning-table", label: "جدول المعنى" },
    ];
    for (const s of tafsirSources) {
      list.push({ id: s.slug, label: s.nameAr });
    }
    return list;
  }, [tafsirSources]);

  const [mode, setMode] = useState<Mode>("words");
  const [activeWord, setActiveWord] = useState<WordRef | null>(null);
  const [fontScale, setFontScale] = useState(1);
  const [fontDraft, setFontDraft] = useState("100");
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [meaningLang, setMeaningLang] = useState<MeaningLang>("ar");
  const [verseEdition, setVerseEdition] = useState(
    () => verseEditions[0]?.slug ?? "saheeh-en",
  );
  const [reciterId, setReciterId] = useState(DEFAULT_RECITER_ID);
  const [bookmarked, setBookmarked] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [wbwPlaying, setWbwPlaying] = useState(false);
  const [repeatCount, setRepeatCount] = useState(1);
  const [ayahNoteDraft, setAyahNoteDraft] = useState("");
  const [syncHighlightPos, setSyncHighlightPos] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wbwStopRef = useRef(false);
  const ayahStopRef = useRef(false);
  const timingsCacheRef = useRef<
    Record<string, { audioUrl: string; verses: Record<string, VerseTiming> }>
  >({});
  const [tafsirCache, setTafsirCache] = useState<
    Record<string, TafsirSurah | null>
  >({});
  const [transCache, setTransCache] = useState<
    Record<string, VerseTranslationSurah | null>
  >({});
  const [tafsirLoading, setTafsirLoading] = useState(false);

  useEffect(() => {
    try {
      recordPageRead(Number(page.page));
    } catch {
      /* ignore */
    }
  }, [page.page]);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(FONT_KEY));
      if (Number.isFinite(saved)) setFontScale(clampFontScale(saved));
      const lang = localStorage.getItem(MEANING_LANG_KEY);
      if (lang === "ar" || lang === "en" || lang === "id" || lang === "ur") {
        setMeaningLang(lang);
      }
      const savedReciter = localStorage.getItem(RECITER_KEY);
      if (savedReciter && RECITERS.some((r) => r.id === savedReciter)) {
        setReciterId(savedReciter);
      }
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
    setFontDraft(String(Math.round(fontScale * 100)));
  }, [fontScale]);

  useEffect(() => {
    const hash = window.location.hash;
    const q = new URLSearchParams(window.location.search).get("v");
    if (hash.startsWith("#s")) {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (q) {
      const m = /^(\d{1,3}):(\d{1,3})$/.exec(q);
      if (m) {
        const el = document.querySelector(`#s${m[1]}-v-${m[2]}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [page.page]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target;
      if (
        el instanceof Element &&
        el.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      if (e.key === "ArrowLeft" && page.page < page.totalPages) {
        window.location.href = `/mushaf/${page.page + 1}`;
      } else if (e.key === "ArrowRight" && page.page > 1) {
        window.location.href = `/mushaf/${page.page - 1}`;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page.page, page.totalPages]);

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

  useEffect(() => {
    return () => {
      wbwStopRef.current = true;
      audioRef.current?.pause();
    };
  }, []);

  const activeTafsir =
    mode !== "words" && mode !== "irab" && mode !== "meaning-table"
      ? mode
      : null;

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

  const stopAllAudio = () => {
    wbwStopRef.current = true;
    ayahStopRef.current = true;
    audioRef.current?.pause();
    if (audioRef.current) {
      audioRef.current.ontimeupdate = null;
      audioRef.current.onended = null;
    }
    setAudioPlaying(false);
    setWbwPlaying(false);
    setSyncHighlightPos(null);
  };

  const loadChapterTimings = async (surahId: number, rid: string) => {
    const cacheKey = `${rid}:${surahId}`;
    if (timingsCacheRef.current[cacheKey]) {
      return timingsCacheRef.current[cacheKey];
    }
    const reciter = getReciter(rid);
    if (!reciter.quranComChapterReciterId) return null;
    try {
      const res = await fetch(`/api/audio-timings/${rid}/${surahId}`);
      if (!res.ok) return null;
      const data = (await res.json()) as {
        audioUrl: string;
        verses: Record<string, VerseTiming>;
      };
      timingsCacheRef.current[cacheKey] = data;
      return data;
    } catch {
      return null;
    }
  };

  const playAyahAudio = async () => {
    if (!selected) return;
    if (audioPlaying) {
      stopAllAudio();
      return;
    }

    ayahStopRef.current = false;
    wbwStopRef.current = true;
    setWbwPlaying(false);
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    const times = Math.max(1, Math.min(10, repeatCount));

    const pack = await loadChapterTimings(selected.surahId, reciterId);
    const verseTiming = pack?.verses[selected.verseKey];
    const useSync = Boolean(pack?.audioUrl && verseTiming);

    try {
      setAudioPlaying(true);
      setShareNote(
        useSync ? "تلاوة مع تمييز الكلمات…" : "جاري تلاوة الآية…",
      );

      for (let i = 0; i < times; i++) {
        if (ayahStopRef.current) break;

        if (useSync && pack && verseTiming) {
          await new Promise<void>((resolve) => {
            const onTime = () => {
              if (ayahStopRef.current) {
                cleanup();
                resolve();
                return;
              }
              const ms = audio.currentTime * 1000;
              if (ms >= verseTiming.timestampTo - 40) {
                audio.pause();
                cleanup();
                resolve();
                return;
              }
              const seg = verseTiming.segments.find(
                (s) => ms >= s.startMs && ms < s.endMs,
              );
              if (seg) {
                setSyncHighlightPos(seg.position);
                setActiveWord({
                  surahId: selected.surahId,
                  verse: selected.verseNumber,
                  position: seg.position,
                });
              }
            };
            const onEnded = () => {
              cleanup();
              resolve();
            };
            const cleanup = () => {
              audio.removeEventListener("timeupdate", onTime);
              audio.removeEventListener("ended", onEnded);
              setSyncHighlightPos(null);
            };
            audio.addEventListener("timeupdate", onTime);
            audio.addEventListener("ended", onEnded);
            audio.src = pack.audioUrl;
            const start = () => {
              try {
                audio.currentTime = verseTiming.timestampFrom / 1000;
              } catch {
                /* ignore seek errors */
              }
              audio.play().catch(() => {
                cleanup();
                resolve();
              });
            };
            if (audio.readyState >= 1) start();
            else audio.addEventListener("loadedmetadata", start, { once: true });
          });
        } else {
          const url = ayahAudioUrl(
            selected.surahId,
            selected.verseNumber,
            reciterId,
          );
          await new Promise<void>((resolve) => {
            const onEnded = () => {
              audio.removeEventListener("ended", onEnded);
              resolve();
            };
            audio.addEventListener("ended", onEnded);
            audio.src = url;
            audio.play().catch(() => {
              audio.removeEventListener("ended", onEnded);
              resolve();
            });
          });
        }
      }
    } catch {
      setShareNote("تعذّر تشغيل الصوت");
      window.setTimeout(() => setShareNote(null), 2000);
    } finally {
      setAudioPlaying(false);
      setSyncHighlightPos(null);
      if (!ayahStopRef.current) setShareNote(null);
    }
  };

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

  const playWordByWordAudio = async () => {
    if (!selected) return;
    if (wbwPlaying || audioPlaying) {
      stopAllAudio();
      return;
    }

    const block = page.blocks.find((b) => b.surahId === selected.surahId);
    const verse = block?.verses.find(
      (v) => v.verseNumber === selected.verseNumber,
    );
    const words = (verse?.words ?? []).filter(
      (w) => !w.charType || w.charType === "word",
    );
    if (!words.length) return;

    wbwStopRef.current = false;
    setWbwPlaying(true);
    setAudioPlaying(false);
    setShareNote("تلاوة كلمة بكلمة…");
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;

    try {
      for (const word of words) {
        if (wbwStopRef.current) break;
        selectWord(selected.surahId, selected.verseNumber, word.position);
        const url = wordAudioUrl(
          selected.surahId,
          selected.verseNumber,
          word.position,
        );
        await new Promise<void>((resolve) => {
          const onEnded = () => {
            cleanup();
            resolve();
          };
          const onError = () => {
            cleanup();
            resolve(); // skip missing clips
          };
          const cleanup = () => {
            audio.removeEventListener("ended", onEnded);
            audio.removeEventListener("error", onError);
          };
          audio.addEventListener("ended", onEnded);
          audio.addEventListener("error", onError);
          audio.src = url;
          audio.play().catch(() => {
            cleanup();
            resolve();
          });
        });
      }
    } catch {
      setShareNote("تعذّر تشغيل التلاوة كلمة بكلمة");
      window.setTimeout(() => setShareNote(null), 2000);
    } finally {
      setWbwPlaying(false);
      if (!wbwStopRef.current) {
        setShareNote(null);
      }
    }
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

  const canShrink = fontScale > FONT_SCALE_MIN + 0.001;
  const canGrow = fontScale < FONT_SCALE_MAX - 0.001;
  const fontPercent = Math.round(fontScale * 100);
  const studySurahId =
    activeWord?.surahId ?? page.blocks[0]?.surahId ?? null;

  const commitFontDraft = () => {
    const normalized = String(fontDraft)
      .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
      .replace(/[^\d.]/g, "");
    const n = Number(normalized);
    if (!Number.isFinite(n) || normalized === "") {
      setFontDraft(String(fontPercent));
      return;
    }
    const next = clampFontScale(n / 100);
    setFontScale(next);
    setFontDraft(String(Math.round(next * 100)));
  };

  return (
    <div
      className="studio"
      style={{ ["--mushaf-scale" as string]: String(fontScale) }}
    >
      <div className="mushaf-toolbar" aria-label="أدوات المصحف">
        <div className="font-scale" role="group" aria-label="حجم خط المصحف">
          <button
            type="button"
            className="tool-btn"
            onClick={() =>
              setFontScale((s) => clampFontScale(s - FONT_SCALE_STEP))
            }
            disabled={!canShrink}
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
              min={Math.round(FONT_SCALE_MIN * 100)}
              max={Math.round(FONT_SCALE_MAX * 100)}
              step={Math.round(FONT_SCALE_STEP * 100)}
              dir="ltr"
              className="font-scale-input"
              value={fontDraft}
              onChange={(e) => setFontDraft(e.target.value)}
              onBlur={commitFontDraft}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitFontDraft();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              onKeyUp={(e) => e.stopPropagation()}
              aria-label="أدخل نسبة حجم الخط يدوياً"
              title={`اكتب رقماً من ${Math.round(FONT_SCALE_MIN * 100)} إلى ${Math.round(FONT_SCALE_MAX * 100)} ثم Enter`}
            />
            <span className="font-scale-suffix" aria-hidden>
              %
            </span>
          </label>
          <button
            type="button"
            className="tool-btn"
            onClick={() =>
              setFontScale((s) => clampFontScale(s + FONT_SCALE_STEP))
            }
            disabled={!canGrow}
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
                value={reciterId}
                onChange={(e) => {
                  const id = e.target.value;
                  setReciterId(id);
                  try {
                    localStorage.setItem(RECITER_KEY, id);
                  } catch {
                    /* ignore */
                  }
                  stopAllAudio();
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
              className={`tool-btn ${audioPlaying ? "is-on" : ""}`}
              onClick={playAyahAudio}
              aria-pressed={audioPlaying}
              title="تلاوة الآية (مع تمييز الكلمات عند توفر التوقيت)"
            >
              {audioPlaying ? "⏸ إيقاف" : "▶ آية"}
            </button>
            <button
              type="button"
              className={`tool-btn ${wbwPlaying ? "is-on" : ""}`}
              onClick={playWordByWordAudio}
              aria-pressed={wbwPlaying}
              title="تلاوة كلمة بكلمة مع تمييز الكلمة"
            >
              {wbwPlaying ? "⏸ إيقاف" : "▶ كلمات"}
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
                        audioPlaying &&
                        selected?.surahId === block.surahId &&
                        selected?.verseNumber === verse.verseNumber &&
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

      {selected ? (
        <>
          <WordStudyDock
            verseKey={selected.verseKey}
            word={selected.word}
            morph={selected.morph}
            meaningLang={meaningLang}
            onMeaningLang={setMeaningLang}
            verseEditions={verseEditions}
            verseEdition={verseEdition}
            onVerseEdition={setVerseEdition}
            verseTranslation={selectedVerseTranslation}
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

      {activeTafsir ? (
        <section
          className="study-sheet"
          role="tabpanel"
          id="study-panel"
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
    </div>
  );
}
