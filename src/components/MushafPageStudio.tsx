"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { ShareMenu } from "@/components/ShareMenu";
import { SurahAudioPlayer } from "@/components/SurahAudioPlayer";
import { getAyahNote, saveAyahNote } from "@/lib/ayah-notes";
import {
  buildMushafShareUrl,
  copyLinkOnly,
  type ShareTarget,
} from "@/lib/share";
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

function ToolIcon({
  name,
}: {
  name: "study" | "irab" | "root" | "listen" | "bookmark" | "share" | "words" | "ayah" | "surah";
}) {
  const paths: Record<string, string> = {
    study: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v15H6.5A2.5 2.5 0 0 0 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2Z",
    irab: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
    root: "M12 22V8M12 8c0-3 2-5 5-5M12 8c0-3-2-5-5-5M7 14c2 0 4 1 5 3 1-2 3-3 5-3",
    listen: "M11 5 6 9H2v6h4l5 4V5Zm7.07 1.93a8 8 0 0 1 0 10.14M15.54 8.46a5 5 0 0 1 0 7.07",
    bookmark: "M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",
    share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13",
    words: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    ayah: "M5 3l14 9-14 9V3z",
    surah: "M9 18V5l12-2v13M6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  };
  return (
    <svg
      className="mtb-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={paths[name]} />
    </svg>
  );
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

  const listenBootRef = useRef<{
    listen: string | null;
    verseKey: string | null;
    done: boolean;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || listenBootRef.current) return;
    const params = new URLSearchParams(window.location.search);
    listenBootRef.current = {
      listen: params.get("listen"),
      verseKey: params.get("v"),
      done: false,
    };
    const reciter = params.get("reciter");
    if (reciter) prefs.persistReciterId(reciter);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- capture deep-link once
  }, []);

  useEffect(() => {
    if (!selected && wordRows[0]) {
      const hasVerseLink =
        typeof window !== "undefined" &&
        Boolean(new URLSearchParams(window.location.search).get("v"));
      if (hasVerseLink) return;
      setActiveWord({
        surahId: wordRows[0].surahId,
        verse: wordRows[0].verseNumber,
        position: wordRows[0].word.position,
      });
    }
  }, [selected, wordRows]);

  useEffect(() => {
    const dl = listenBootRef.current;
    if (!dl || dl.done || !wordRows.length) return;

    if (dl.verseKey) {
      const m = /^(\d{1,3}):(\d{1,3})$/.exec(dl.verseKey);
      if (m) {
        const sid = Number(m[1]);
        const vid = Number(m[2]);
        const found = wordRows.find(
          (r) => r.surahId === sid && r.verseNumber === vid,
        );
        if (found) {
          const matches =
            selected?.surahId === sid && selected?.verseNumber === vid;
          if (!matches) {
            setActiveWord({
              surahId: found.surahId,
              verse: found.verseNumber,
              position: found.word.position,
            });
            return;
          }
        }
      }
    }

    if (!dl.listen) {
      dl.done = true;
      return;
    }

    if (!selected) return;

    if (dl.verseKey) {
      const m = /^(\d{1,3}):(\d{1,3})$/.exec(dl.verseKey);
      if (
        m &&
        (selected.surahId !== Number(m[1]) ||
          selected.verseNumber !== Number(m[2]))
      ) {
        return;
      }
    }

    dl.done = true;
    const block =
      page.blocks.find((b) => b.surahId === selected.surahId) ??
      page.blocks[0];
    if (dl.listen === "surah" && block) {
      void audio.playSurahAudio(
        block.surahId,
        block.meta.versesCount,
        selected.verseNumber,
        getSurahUthmaniTitle(block.surahId),
      );
    } else if (dl.listen === "ayah") {
      void audio.playAyahAudio();
    } else if (dl.listen === "wbw") {
      void audio.playWordByWordAudio();
    }
    // Intentional: deep-link boot once selection is ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, wordRows, page.blocks]);

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
    const path = buildMushafShareUrl({
      page: page.page,
      kind: "ayah",
      verse: `${surahId}:${verseNumber}`,
      surahId,
    });
    const ok = await copyLinkOnly(path);
    setShareNote(ok ? "تم نسخ رابط الآية" : path);
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

  const studyBlock =
    page.blocks.find((b) => b.surahId === studySurahId) ?? page.blocks[0];

  const shareTargets = useMemo((): ShareTarget[] => {
    const targets: ShareTarget[] = [
      {
        id: "page",
        kind: "page",
        label: "الصفحة",
        hint: `رابط صفحة المصحف ${toArabicNumerals(page.page)} — يفتح هذه الصفحة مباشرة.`,
        payload: {
          kind: "page",
          title: `عربية — صفحة ${toArabicNumerals(page.page)}`,
          text: `مصحف المدينة — الصفحة ${toArabicNumerals(page.page)} على عربية`,
          url: buildMushafShareUrl({ page: page.page, kind: "page" }),
        },
      },
    ];

    if (studyBlock) {
      const sid = studyBlock.surahId;
      const surahTitle = getSurahUthmaniTitle(sid);
      targets.push({
        id: "surah",
        kind: "surah",
        label: "السورة",
        hint: `رابط سورة ${surahTitle} — يميّز السورة عن الصفحة والآية.`,
        payload: {
          kind: "surah",
          title: `عربية — ${surahTitle}`,
          text: `دراسة سورة ${surahTitle} على عربية`,
          url: buildMushafShareUrl({
            page: page.page,
            kind: "surah",
            surahId: sid,
          }),
        },
      });
    }

    if (selected && studyBlock) {
      const verse = studyBlock.verses.find(
        (v) => v.verseNumber === selected.verseNumber,
      );
      const ayahText = verse?.words.map((w) => w.text).join(" ") ?? "";
      const verseKey = `${selected.surahId}:${selected.verseNumber}`;
      const surahTitle = getSurahUthmaniTitle(selected.surahId);
      const ayahLabel = `${surahTitle} ${toArabicNumerals(selected.verseNumber)}`;

      targets.unshift({
        id: "ayah",
        kind: "ayah",
        label: "الآية",
        hint: `رابط الآية ${ayahLabel} — ينقلك إلى نفس الآية في المصحف.`,
        payload: {
          kind: "ayah",
          title: `عربية — ${ayahLabel}`,
          text: `${ayahText}\n\n${ayahLabel}`,
          url: buildMushafShareUrl({
            page: page.page,
            kind: "ayah",
            verse: verseKey,
            surahId: selected.surahId,
          }),
        },
      });

      targets.push({
        id: "listen-ayah",
        kind: "listen-ayah",
        label: "استماع آية",
        hint: "رابط يشغّل تلاوة الآية تلقائياً عند الفتح.",
        payload: {
          kind: "listen-ayah",
          title: `استماع — ${ayahLabel}`,
          text: `استمع لتلاوة ${ayahLabel} على عربية`,
          url: buildMushafShareUrl({
            page: page.page,
            kind: "listen-ayah",
            verse: verseKey,
            surahId: selected.surahId,
            reciter: prefs.reciterId,
          }),
        },
      });

      targets.push({
        id: "listen-wbw",
        kind: "listen-wbw",
        label: "كلمة بكلمة",
        hint: "رابط يشغّل التلاوة كلمة بكلمة عند الفتح.",
        payload: {
          kind: "listen-wbw",
          title: `كلمة بكلمة — ${ayahLabel}`,
          text: `استمع كلمة بكلمة لـ ${ayahLabel} على عربية`,
          url: buildMushafShareUrl({
            page: page.page,
            kind: "listen-wbw",
            verse: verseKey,
            surahId: selected.surahId,
            reciter: prefs.reciterId,
          }),
        },
      });

      targets.push({
        id: "listen-surah",
        kind: "listen-surah",
        label: "استماع سورة",
        hint: `رابط يشغّل سورة ${surahTitle} من الآية الحالية.`,
        payload: {
          kind: "listen-surah",
          title: `استماع — ${surahTitle}`,
          text: `استمع لسورة ${surahTitle} على عربية`,
          url: buildMushafShareUrl({
            page: page.page,
            kind: "listen-surah",
            verse: verseKey,
            surahId: selected.surahId,
            reciter: prefs.reciterId,
          }),
        },
      });

      const note = ayahNoteDraft.trim();
      if (note) {
        targets.push({
          id: "note",
          kind: "note",
          label: "الملاحظة",
          hint: "مشاركة الملاحظة مع رابط الآية.",
          payload: {
            kind: "note",
            title: `ملاحظة — ${ayahLabel}`,
            text: `${ayahText}\n\nملاحظة: ${note}`,
            url: buildMushafShareUrl({
              page: page.page,
              kind: "note",
              verse: verseKey,
              surahId: selected.surahId,
            }),
          },
        });
      }
    }

    return targets;
  }, [
    ayahNoteDraft,
    page.page,
    prefs.reciterId,
    selected,
    studyBlock,
  ]);

  return (
    <div
      className="studio"
      style={{ ["--mushaf-scale" as string]: String(prefs.fontScale) }}
    >
      <div className="mushaf-toolbar" aria-label="أدوات المصحف">
        <div className="mtb-group mtb-font font-scale" role="group" aria-label="حجم خط المصحف">
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

        <div className="mtb-group mtb-study" role="group" aria-label="دراسة">
          {studySurahId ? (
            <Link
              href={`/surah/${studySurahId}/read`}
              className="tool-btn mtb-link"
              title="دراسة السورة مع خيارات الإعراب والدراسة السريعة"
            >
              <ToolIcon name="study" />
              <span>دراسة السورة</span>
            </Link>
          ) : null}
          {selected ? (
            <Link
              href={`/ayah/${selected.surahId}/${selected.verseNumber}`}
              className="tool-btn mtb-link"
              title="صفحة إعراب الآية كلمة بكلمة"
            >
              <ToolIcon name="irab" />
              <span>إعراب الآية</span>
            </Link>
          ) : null}
          {selected?.morph?.root ? (
            <Link
              href={`/root/${encodeURIComponent(selected.morph.root)}`}
              className="tool-btn mtb-link"
              title="مواضع الجذر في القرآن"
            >
              <ToolIcon name="root" />
              <span>الجذر</span>
            </Link>
          ) : null}
        </div>

        <div className="mtb-group mtb-listen" role="group" aria-label="استماع">
          <span className="mtb-label">
            <ToolIcon name="listen" />
            استماع
          </span>
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
              disabled={!selected && !studyBlock}
            >
              {RECITERS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nameAr}
                </option>
              ))}
            </select>
          </label>
          <label className="repeat-pick">
            <span className="sr-only">تكرار التلاوة</span>
            <select
              className="reciter-select"
              value={repeatCount}
              onChange={(e) => setRepeatCount(Number(e.target.value))}
              aria-label="عدد مرات التكرار (كلمات أو آية أو سورة)"
              title="يُطبَّق التكرار على الكلمات والآية والسورة"
              disabled={!selected && !studyBlock}
            >
              {[1, 2, 3, 5, 7, 10].map((n) => (
                <option key={n} value={n}>
                  ×{toArabicNumerals(n)}
                </option>
              ))}
            </select>
          </label>
          <span className="mtb-scope-label" aria-hidden>
            يُطبَّق على
          </span>
          <div className="mtb-scope" role="group" aria-label="نطاق الاستماع">
            <button
              type="button"
              className={`tool-btn mtb-link ${audio.wbwPlaying ? "is-on" : ""}`}
              onClick={() => void audio.playWordByWordAudio()}
              aria-pressed={audio.wbwPlaying}
              disabled={!selected}
              title="تلاوة كلمة بكلمة — مع التكرار المحدد"
            >
              <ToolIcon name="words" />
              <span>{audio.wbwPlaying ? "إيقاف" : "كلمات"}</span>
            </button>
            <button
              type="button"
              className={`tool-btn mtb-link ${audio.audioPlaying ? "is-on" : ""}`}
              onClick={() => void audio.playAyahAudio()}
              aria-pressed={audio.audioPlaying}
              disabled={!selected}
              title={
                reciterHasWordSync(prefs.reciterId)
                  ? "تلاوة الآية مع تمييز الكلمات"
                  : "تلاوة الآية (تمييز الكلمات غير متاح لهذا القارئ — جرّب العفاسي)"
              }
            >
              <ToolIcon name="ayah" />
              <span>{audio.audioPlaying ? "إيقاف" : "آية"}</span>
            </button>
            <button
              type="button"
              className={`tool-btn mtb-link ${audio.surahPlaying ? "is-on" : ""}`}
              onClick={() => {
                if (!studyBlock) return;
                void audio.playSurahAudio(
                  studyBlock.surahId,
                  studyBlock.meta.versesCount,
                  selected?.verseNumber ?? 1,
                  getSurahUthmaniTitle(studyBlock.surahId),
                );
              }}
              aria-pressed={audio.surahPlaying}
              disabled={!studyBlock}
              title="تلاوة السورة كاملة مع مشغّل التحكم"
            >
              <ToolIcon name="surah" />
              <span>{audio.surahPlaying ? "إيقاف" : "سورة"}</span>
            </button>
          </div>
        </div>

        <div className="mtb-group mtb-actions" role="group" aria-label="إجراءات">
          {selected ? (
            <button
              type="button"
              className={`tool-btn mtb-link bookmark-btn ${bookmarked ? "is-on" : ""}`}
              onClick={onToggleBookmark}
              aria-pressed={bookmarked}
            >
              <ToolIcon name="bookmark" />
              <span>{bookmarked ? "مفضّلة" : "حفظ الآية"}</span>
            </button>
          ) : null}
          <ShareMenu
            targets={shareTargets}
            label="مشاركة"
            onStatus={flashShareNote}
          />
        </div>
        {shareNote ? <span className="share-note">{shareNote}</span> : null}
      </div>

      <SurahAudioPlayer
        state={audio.surahPlayer}
        onPause={audio.pauseSurah}
        onResume={audio.resumeSurah}
        onSeek={audio.seekSurah}
        onRate={audio.setSurahRate}
        onPin={audio.setSurahPinned}
        onClose={audio.closeSurahPlayer}
      />

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

      <p className="study-modes-hint">
        أوضاع عرض الصفحة (كلمات · إعراب · جدول معنى · تفاسير) منفصلة عن طبقات
        دراسة الكلمة أعلاه عند اختيار كلمة.
      </p>
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
