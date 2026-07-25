"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  IrabSurah,
  IrabWord,
  TafsirSource,
  VerseTranslationEdition,
} from "@/lib/types";
import type { MushafPageContent } from "@/lib/mushaf";
import { formatVerseKey, toArabicNumerals } from "@/lib/format";
import { isBookmarked, toggleBookmark } from "@/lib/bookmarks";
import { getSurahUthmaniTitle } from "@/lib/surah-names";
import { makeWordId } from "@/lib/word-id";
import { narrativeIrab } from "@/lib/irab-narrative";
import { WordStudyDock } from "@/components/WordStudyDock";
import { SurahAudioPlayer } from "@/components/SurahAudioPlayer";
import { MushafToolbar } from "@/components/mushaf/MushafToolbar";
import { MushafPageFrame } from "@/components/mushaf/MushafPageFrame";
import { MushafStudySheets } from "@/components/mushaf/MushafStudySheets";
import { getAyahNote, saveAyahNote } from "@/lib/ayah-notes";
import {
  buildMushafShareUrl,
  copyLinkOnly,
  type ShareTarget,
} from "@/lib/share";
import { useMushafPrefs } from "@/hooks/useMushafPrefs";
import { useMushafStudyCache } from "@/hooks/useMushafStudyCache";
import { useQuranAudio } from "@/hooks/useQuranAudio";
import { clampFontScale, type WordRef } from "@/hooks/mushaf-utils";

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
      <MushafToolbar
        prefs={prefs}
        studySurahId={studySurahId}
        selected={selected}
        studyBlock={studyBlock ?? null}
        surahTitle={
          studyBlock
            ? getSurahUthmaniTitle(studyBlock.surahId)
            : ""
        }
        repeatCount={repeatCount}
        setRepeatCount={setRepeatCount}
        bookmarked={bookmarked}
        onToggleBookmark={onToggleBookmark}
        shareTargets={shareTargets}
        shareNote={shareNote}
        onShareStatus={flashShareNote}
        clampFontScale={clampFontScale}
        audio={audio}
      />

      <SurahAudioPlayer
        state={audio.surahPlayer}
        onPause={audio.pauseSurah}
        onResume={audio.resumeSurah}
        onSeek={audio.seekSurah}
        onRate={audio.setSurahRate}
        onPin={audio.setSurahPinned}
        onClose={audio.closeSurahPlayer}
      />

      <MushafPageFrame
        page={page}
        activeWord={activeWord}
        meaningLang={prefs.meaningLang}
        selectWord={selectWord}
        shareAyah={(sid, vn) => void shareAyah(sid, vn)}
        audioPlaying={audio.audioPlaying}
        syncHighlightPos={audio.syncHighlightPos}
        selectedSurahId={selected?.surahId ?? null}
        selectedVerseNumber={selected?.verseNumber ?? null}
      />

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
            verseTranslationStatus={study.selectedVerseTranslationStatus}
            tafsirSources={tafsirSources}
            ensureTafsirSurah={study.ensureTafsirSurah}
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

      <MushafStudySheets
        pageNumber={page.page}
        modes={modes}
        mode={mode}
        onModeChange={setMode}
        meaningLang={prefs.meaningLang}
        onMeaningLang={prefs.setMeaningLang}
        wordRows={wordRows}
        selectedKey={selected?.key ?? null}
        activeWord={activeWord}
        selectWord={selectWord}
        activeTafsir={study.activeTafsir}
        tafsirSources={tafsirSources}
        tafsirLoading={study.tafsirLoading}
        tafsirRows={study.tafsirRows}
      />
    </div>
  );
}
