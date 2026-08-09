"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type {
  IrabSurah,
  IrabWord,
  TafsirSource,
  VerseTranslationEdition,
  WordSensesSurah,
} from "@/lib/types";
import type { MushafPageContent } from "@/lib/mushaf";
import type { MushafPageStudyPayload } from "@/lib/mushaf-page-study";
import { formatVerseKey, toArabicNumerals } from "@/lib/format";
import { isBookmarked, toggleBookmark } from "@/lib/bookmarks";
import { getSurahDisplayTitle } from "@/lib/surah-names";
import { makeWordId } from "@/lib/word-id";
import { narrativeIrab } from "@/lib/irab-narrative";
import { orderTafsirSources, tafsirDisplayName } from "@/lib/tafsir-label";
import { MushafToolbar } from "@/components/mushaf/MushafToolbar";
import { MushafPageFrame } from "@/components/mushaf/MushafPageFrame";
import { getAyahNote, saveAyahNote } from "@/lib/ayah-notes";
import {
  buildMushafShareUrl,
  copyLinkOnly,
  type ShareTarget,
} from "@/lib/share";
import { apiGet } from "@/lib/api-client";
import { useMushafPrefs } from "@/hooks/useMushafPrefs";
import { useMushafStudyCache } from "@/hooks/useMushafStudyCache";
import { useQuranAudio, type AudioStatusKey } from "@/hooks/useQuranAudio";
import { clampFontScale, type WordRef } from "@/hooks/mushaf-utils";

/** Study/audio UI — code-split so first paint is the mushaf page only. */
const WordStudyDock = dynamic(
  () => import("@/components/WordStudyDock").then((m) => m.WordStudyDock),
  { ssr: false },
);
const SurahAudioPlayer = dynamic(
  () =>
    import("@/components/SurahAudioPlayer").then((m) => m.SurahAudioPlayer),
  { ssr: false },
);
const MushafStudySheets = dynamic(
  () =>
    import("@/components/mushaf/MushafStudySheets").then(
      (m) => m.MushafStudySheets,
    ),
  { ssr: false },
);

type Props = {
  page: MushafPageContent;
  tafsirSources: TafsirSource[];
  verseEditions: VerseTranslationEdition[];
};

type Mode = "words" | "irab" | "meaning-table" | string;

function formatPageNum(page: number, locale: string): string {
  return locale === "ar" ? toArabicNumerals(page) : String(page);
}

export function MushafPageStudio({
  page,
  tafsirSources,
  verseEditions,
}: Props) {
  const locale = useLocale();
  const tModes = useTranslations("Mushaf.modes");
  const tMushaf = useTranslations("Mushaf");
  const tShare = useTranslations("Mushaf.shareTargets");
  const tToast = useTranslations("Mushaf.toast");
  const tAudio = useTranslations("Audio");

  const [irabBySurah, setIrabBySurah] = useState<
    Record<number, IrabSurah | null>
  >({});
  const [sensesBySurah, setSensesBySurah] = useState<
    Record<number, WordSensesSurah | null>
  >({});
  const [lexiconByKey, setLexiconByKey] = useState<Record<string, string>>({});
  const [studyReady, setStudyReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStudyReady(false);
    setIrabBySurah({});
    setSensesBySurah({});
    setLexiconByKey({});

    const loadStudy = () => {
      void (async () => {
        try {
          const res = await apiGet(`/api/mushaf/${page.page}/study`);
          if (!res.ok || cancelled) return;
          const data = (await res.json()) as MushafPageStudyPayload;
          if (cancelled) return;
          setIrabBySurah(data.irabBySurah);
          setSensesBySurah(data.sensesBySurah);
          setLexiconByKey(data.lexiconByKey);
          setStudyReady(true);
        } catch {
          if (!cancelled) setStudyReady(true);
        }
      })();
    };

    // After first paint — do not compete with LCP/FCP on the critical path.
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const w = window as Window & {
      requestIdleCallback?: (
        cb: () => void,
        opts?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      idleId = w.requestIdleCallback(loadStudy, { timeout: 1800 });
    } else {
      timeoutId = setTimeout(loadStudy, 1);
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined && typeof w.cancelIdleCallback === "function") {
        w.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [page.page]);

  const modes: { id: Mode; label: string }[] = useMemo(() => {
    const list: { id: Mode; label: string }[] = [
      { id: "words", label: tModes("words") },
      { id: "irab", label: tModes("irab") },
      { id: "meaning-table", label: tModes("meaningTable") },
    ];
    for (const s of orderTafsirSources(tafsirSources, locale)) {
      list.push({ id: s.slug, label: tafsirDisplayName(s, locale) });
    }
    return list;
  }, [tafsirSources, tModes, locale]);

  const orderedTafsirSources = useMemo(
    () => orderTafsirSources(tafsirSources, locale),
    [tafsirSources, locale],
  );

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
              irab: narrativeIrab(morph ?? null, locale),
            };
          }),
        ),
      ),
    [page.blocks, irabWordMap, locale],
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

  const onAudioStatus = (
    key: AudioStatusKey | null,
    values?: Record<string, string | number>,
    clearMs?: number,
  ) => {
    flashShareNote(key ? tAudio(key, values) : null, clearMs);
  };

  const audio = useQuranAudio({
    selected,
    reciterId: prefs.reciterId,
    repeatCount,
    page,
    onHighlightWord: setActiveWord,
    onSelectWord: selectWord,
    onStatusNote: onAudioStatus,
    tAudio,
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
    // Only auto-select when deep-linking to a verse (?v=).
    // Selecting on every load opens the study dock and steals LCP.
    if (selected || !wordRows[0]) return;
    if (typeof window === "undefined") return;
    const verseKey = new URLSearchParams(window.location.search).get("v");
    if (!verseKey) return;
    const m = /^(\d{1,3}):(\d{1,3})$/.exec(verseKey);
    if (!m) return;
    const sid = Number(m[1]);
    const vid = Number(m[2]);
    const found = wordRows.find(
      (r) => r.surahId === sid && r.verseNumber === vid,
    );
    if (!found) return;
    setActiveWord({
      surahId: found.surahId,
      verse: found.verseNumber,
      position: found.word.position,
    });
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
        getSurahDisplayTitle(block.surahId, locale),
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
    setShareNote(ok ? tToast("ayahLinkCopied") : path);
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
        ? tToast("bookmarkAdded")
        : tToast("bookmarkRemoved"),
    );
    window.setTimeout(() => setShareNote(null), 1800);
  };

  const studySurahId =
    activeWord?.surahId ?? page.blocks[0]?.surahId ?? null;

  const studyBlock =
    page.blocks.find((b) => b.surahId === studySurahId) ?? page.blocks[0];

  const shareTargets = useMemo((): ShareTarget[] => {
    const pageLabel = formatPageNum(page.page, locale);
    const targets: ShareTarget[] = [
      {
        id: "page",
        kind: "page",
        label: tShare("page"),
        hint: tShare("hintPage", { page: pageLabel }),
        payload: {
          kind: "page",
          title: tShare("titlePage", { page: pageLabel }),
          text: tShare("textPage", { page: pageLabel }),
          url: buildMushafShareUrl({ page: page.page, kind: "page" }),
        },
      },
    ];

    if (studyBlock) {
      const sid = studyBlock.surahId;
      const surahTitle = getSurahDisplayTitle(sid, locale);
      targets.push({
        id: "surah",
        kind: "surah",
        label: tShare("surah"),
        hint: tShare("hintSurah", { surah: surahTitle }),
        payload: {
          kind: "surah",
          title: tShare("titleSurah", { surah: surahTitle }),
          text: tShare("textSurah", { surah: surahTitle }),
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
      const surahTitle = getSurahDisplayTitle(selected.surahId, locale);
      const ayahLabel = `${surahTitle} ${formatPageNum(selected.verseNumber, locale)}`;

      targets.unshift({
        id: "ayah",
        kind: "ayah",
        label: tShare("ayah"),
        hint: tShare("hintAyah", { label: ayahLabel }),
        payload: {
          kind: "ayah",
          title: tShare("titleAyah", { label: ayahLabel }),
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
        label: tShare("listenAyah"),
        hint: tShare("hintListenAyah"),
        payload: {
          kind: "listen-ayah",
          title: tShare("titleListenAyah", { label: ayahLabel }),
          text: tShare("textListenAyah", { label: ayahLabel }),
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
        label: tShare("listenWbw"),
        hint: tShare("hintListenWbw"),
        payload: {
          kind: "listen-wbw",
          title: tShare("titleListenWbw", { label: ayahLabel }),
          text: tShare("textListenWbw", { label: ayahLabel }),
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
        label: tShare("listenSurah"),
        hint: tShare("hintListenSurah", { surah: surahTitle }),
        payload: {
          kind: "listen-surah",
          title: tShare("titleListenSurah", { surah: surahTitle }),
          text: tShare("textListenSurah", { surah: surahTitle }),
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
          label: tShare("note"),
          hint: tShare("hintNote"),
          payload: {
            kind: "note",
            title: tShare("titleNote", { label: ayahLabel }),
            text: `${ayahText}\n\n${tShare("textNoteSuffix", { note })}`,
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
    locale,
    page.page,
    prefs.reciterId,
    selected,
    studyBlock,
    tShare,
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
            ? getSurahDisplayTitle(studyBlock.surahId, locale)
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
            wordId={selected.wordId}
            morph={selected.morph}
            senseEntry={
              sensesBySurah[selected.surahId]?.words[selected.wordId] ?? null
            }
            lexiconText={(() => {
              const key =
                sensesBySurah[selected.surahId]?.words[selected.wordId]
                  ?.lexiconKey ?? null;
              return key ? (lexiconByKey[key] ?? null) : null;
            })()}
            meaningLang={prefs.meaningLang}
            onMeaningLang={prefs.setMeaningLang}
            verseEditions={verseEditions}
            verseEdition={prefs.verseEdition}
            onVerseEdition={prefs.setVerseEdition}
            verseTranslation={study.selectedVerseTranslation}
            verseTranslationStatus={study.selectedVerseTranslationStatus}
            tafsirSources={orderedTafsirSources}
            ensureTafsirSurah={study.ensureTafsirSurah}
          />
          <div className="ayah-note-panel">
            <label className="ayah-note-label" htmlFor="ayah-note">
              {tMushaf("noteLabel", {
                verse: formatVerseKey(selected.verseKey, locale),
              })}
            </label>
            <textarea
              id="ayah-note"
              className="ayah-note-input"
              rows={3}
              maxLength={4000}
              value={ayahNoteDraft}
              placeholder={tMushaf("notePlaceholder")}
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
        tafsirSources={orderedTafsirSources}
        tafsirLoading={
          study.tafsirLoading ||
          (!studyReady && (mode === "irab" || mode === "meaning-table"))
        }
        tafsirRows={study.tafsirRows}
      />
    </div>
  );
}
