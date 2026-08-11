"use client";

import { useEffect, useRef, useState } from "react";
import {
  ayahAudioUrl,
  getReciter,
  reciterDisplayName,
  reciterHasWordSync,
  wordAudioUrl,
  type VerseTiming,
  type WordTimingSegment,
} from "@/lib/audio";
import { apiGet } from "@/lib/api-client";
import {
  clearMediaSession,
  setMediaSessionPaused,
  setMediaSessionPlaying,
} from "@/lib/media-session";
import type { MushafPageContent } from "@/lib/mushaf";
import type { WordRef } from "@/hooks/mushaf-utils";
import {
  hardStopMedia,
  playClipToEnd,
  playUrlUntilEnd,
  unlockAudioElement,
} from "@/lib/quran-audio-playback";

function uiLocale(): string {
  if (typeof document === "undefined") return "ar";
  return document.documentElement.lang === "en" ? "en" : "ar";
}

function reciterArtist(reciterId: string): string {
  return reciterDisplayName(getReciter(reciterId), uiLocale());
}

type SelectedAyah = {
  surahId: number;
  verseNumber: number;
  verseKey: string;
} | null;

type AyahTarget = {
  surahId: number;
  verseNumber: number;
  verseKey: string;
};

type TimingsPack = {
  audioUrl: string;
  verses: Record<string, VerseTiming>;
};

type ExclusiveMode = "ayah" | "wbw" | "surah";

export type AudioStatusKey =
  | "ayahSyncPlaying"
  | "ayahPlayingNoSync"
  | "playError"
  | "wbwPlaying"
  | "wbwError"
  | "needWord"
  | "surahResolveError"
  | "surahPlayingFrom"
  | "surahConnectionError"
  | "surahPlayError";

export type OnAudioStatus = (
  key: AudioStatusKey | null,
  values?: Record<string, string | number>,
  clearMs?: number,
) => void;

export type SurahPlayerState = {
  active: boolean;
  playing: boolean;
  pinned: boolean;
  surahId: number | null;
  title: string;
  currentTime: number;
  duration: number;
  playbackRate: number;
  mode: "chapter" | "verses";
  verseIndex: number;
  versesCount: number;
};

const emptyPlayer: SurahPlayerState = {
  active: false,
  playing: false,
  pinned: false,
  surahId: null,
  title: "",
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
  mode: "verses",
  verseIndex: 0,
  versesCount: 0,
};

function firstAyahOnPage(page: MushafPageContent): AyahTarget | null {
  const block = page.blocks[0];
  const verse = block?.verses[0];
  if (!block || !verse) return null;
  return {
    surahId: block.surahId,
    verseNumber: verse.verseNumber,
    verseKey: `${block.surahId}:${verse.verseNumber}`,
  };
}

function verseWords(
  page: MushafPageContent,
  surahId: number,
  verseNumber: number,
) {
  const block = page.blocks.find((b) => b.surahId === surahId);
  const verse = block?.verses.find((v) => v.verseNumber === verseNumber);
  return (verse?.words ?? []).filter(
    (w) => !w.charType || w.charType === "word",
  );
}

function verseTimingAt(
  verses: Record<string, VerseTiming>,
  ms: number,
): { timing: VerseTiming; segment: WordTimingSegment | null } | null {
  for (const timing of Object.values(verses)) {
    if (ms >= timing.timestampFrom && ms < timing.timestampTo - 40) {
      const segment =
        timing.segments.find((s) => ms >= s.startMs && ms < s.endMs) ?? null;
      return { timing, segment };
    }
  }
  return null;
}

function parseVerseKey(verseKey: string): { surahId: number; verse: number } {
  const [sid, vn] = verseKey.split(":");
  return { surahId: Number(sid), verse: Number(vn) };
}

export function useQuranAudio({
  selected,
  reciterId,
  repeatCount,
  page,
  onHighlightWord,
  onSelectWord,
  onStatusNote,
  tAudio,
}: {
  selected: SelectedAyah;
  reciterId: string;
  repeatCount: number;
  page: MushafPageContent;
  onHighlightWord: (ref: WordRef) => void;
  onSelectWord: (surahId: number, verse: number, position: number) => void;
  onStatusNote: OnAudioStatus;
  tAudio: (key: string, values?: Record<string, string | number>) => string;
}) {
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [wbwPlaying, setWbwPlaying] = useState(false);
  const [surahPlaying, setSurahPlaying] = useState(false);
  const [syncHighlightPos, setSyncHighlightPos] = useState<number | null>(null);
  const [surahPlayer, setSurahPlayer] = useState<SurahPlayerState>(emptyPlayer);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionRef = useRef(0);
  const modeRef = useRef<ExclusiveMode | null>(null);
  const ayahStopRef = useRef(false);
  const wbwStopRef = useRef(false);
  const surahStopRef = useRef(false);
  const surahPausedRef = useRef(false);
  const pinnedRef = useRef(false);
  const rateRef = useRef(1);
  const prevPageRef = useRef<number | null>(null);
  const prevReciterRef = useRef<string | null>(null);
  const surahMetaRef = useRef<{
    surahId: number;
    versesCount: number;
    fromVerse: number;
    title: string;
  } | null>(null);
  const timingsCacheRef = useRef<Record<string, TimingsPack | null>>({});
  const timingsInflightRef = useRef<
    Record<string, Promise<TimingsPack | null>>
  >({});

  const pageNum = page.page;
  const resolvedReciterId = getReciter(reciterId).id;

  const isSessionCurrent = (session: number) => sessionRef.current === session;

  const stopAllAudio = () => {
    sessionRef.current += 1;
    modeRef.current = null;
    ayahStopRef.current = true;
    wbwStopRef.current = true;
    surahStopRef.current = true;
    surahPausedRef.current = false;
    hardStopMedia(audioRef.current);
    clearMediaSession();
    setAudioPlaying(false);
    setWbwPlaying(false);
    setSurahPlaying(false);
    setSyncHighlightPos(null);
    setSurahPlayer((p) => ({
      ...emptyPlayer,
      pinned: pinnedRef.current ? p.pinned : false,
    }));
  };

  const beginExclusive = (
    mode: ExclusiveMode,
  ): { start: boolean; session: number } => {
    if (
      modeRef.current === mode &&
      (audioPlaying || wbwPlaying || surahPlaying)
    ) {
      stopAllAudio();
      return { start: false, session: sessionRef.current };
    }

    const session = sessionRef.current + 1;
    sessionRef.current = session;
    modeRef.current = mode;

    clearMediaSession();
    hardStopMedia(audioRef.current);

    if (!audioRef.current) audioRef.current = new Audio();
    unlockAudioElement(audioRef.current);

    ayahStopRef.current = mode !== "ayah";
    wbwStopRef.current = mode !== "wbw";
    surahStopRef.current = mode !== "surah";
    surahPausedRef.current = false;

    setAudioPlaying(mode === "ayah");
    setWbwPlaying(mode === "wbw");
    setSurahPlaying(mode === "surah");
    setSyncHighlightPos(null);
    if (mode !== "surah") {
      setSurahPlayer(emptyPlayer);
    }

    return { start: true, session };
  };

  const resolveAyahTarget = (): AyahTarget | null => {
    if (selected) {
      return {
        surahId: selected.surahId,
        verseNumber: selected.verseNumber,
        verseKey:
          selected.verseKey ||
          `${selected.surahId}:${selected.verseNumber}`,
      };
    }

    const first = firstAyahOnPage(page);
    if (!first) return null;

    const words = verseWords(page, first.surahId, first.verseNumber);
    if (words.length) {
      onSelectWord(first.surahId, first.verseNumber, words[0].position);
    }

    return first;
  };

  const loadChapterTimings = async (
    surahId: number,
    rid: string,
  ): Promise<TimingsPack | null> => {
    const cacheKey = `${rid}:${surahId}`;
    if (Object.prototype.hasOwnProperty.call(timingsCacheRef.current, cacheKey)) {
      return timingsCacheRef.current[cacheKey];
    }

    const inflight = timingsInflightRef.current[cacheKey];
    if (inflight) return inflight;

    const reciter = getReciter(rid);
    if (!reciter.quranComChapterReciterId) {
      timingsCacheRef.current[cacheKey] = null;
      return null;
    }

    const promise = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await apiGet(`/api/audio-timings/${rid}/${surahId}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          timingsCacheRef.current[cacheKey] = null;
          return null;
        }
        const data = (await res.json()) as TimingsPack;
        timingsCacheRef.current[cacheKey] = data;
        return data;
      } catch {
        timingsCacheRef.current[cacheKey] = null;
        return null;
      } finally {
        clearTimeout(timer);
        delete timingsInflightRef.current[cacheKey];
      }
    })();

    timingsInflightRef.current[cacheKey] = promise;
    return promise;
  };

  const resolveTimings = async (
    surahId: number,
    rid: string,
    waitMs = 500,
  ): Promise<TimingsPack | null> => {
    const cacheKey = `${rid}:${surahId}`;
    if (Object.prototype.hasOwnProperty.call(timingsCacheRef.current, cacheKey)) {
      return timingsCacheRef.current[cacheKey];
    }

    const loadPromise = loadChapterTimings(surahId, rid);
    if (waitMs <= 0) return loadPromise;

    const timeoutPromise = new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), waitMs);
    });

    return Promise.race([loadPromise, timeoutPromise]);
  };

  const mediaStopHandlers = (session: number, mode: ExclusiveMode) => ({
    onPause: () => {
      if (modeRef.current !== mode || !isSessionCurrent(session)) return;
      stopAllAudio();
    },
    onStop: () => {
      if (modeRef.current !== mode || !isSessionCurrent(session)) return;
      stopAllAudio();
    },
  });

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  useEffect(() => {
    const pageChanged =
      prevPageRef.current !== null && prevPageRef.current !== pageNum;
    const reciterChanged =
      prevReciterRef.current !== null &&
      prevReciterRef.current !== resolvedReciterId;

    prevPageRef.current = pageNum;
    prevReciterRef.current = resolvedReciterId;

    if (pageChanged || reciterChanged) {
      stopAllAudio();
    }
  }, [pageNum, resolvedReciterId]);

  useEffect(() => {
    if (!reciterHasWordSync(resolvedReciterId)) return;
    for (const block of page.blocks) {
      void loadChapterTimings(block.surahId, resolvedReciterId);
    }
  }, [pageNum, resolvedReciterId, page.blocks]);

  const playAyahAudio = async () => {
    const { start, session } = beginExclusive("ayah");
    if (!start) return;

    const target = resolveAyahTarget();
    if (!target) {
      stopAllAudio();
      return;
    }

    const audio = audioRef.current!;
    const times = Math.max(1, Math.min(10, repeatCount));

    setMediaSessionPlaying(
      {
        title: tAudio("mediaSessionAyah", { verseKey: target.verseKey }),
        artist: reciterArtist(resolvedReciterId),
      },
      mediaStopHandlers(session, "ayah"),
    );

    const pack = await resolveTimings(target.surahId, resolvedReciterId);
    if (!isSessionCurrent(session) || ayahStopRef.current) {
      setAudioPlaying(false);
      clearMediaSession();
      return;
    }

    const verseTiming = pack?.verses[target.verseKey];
    const useSync = Boolean(pack?.audioUrl && verseTiming);

    let failed = false;
    try {
      onStatusNote(useSync ? "ayahSyncPlaying" : "ayahPlayingNoSync");

      for (let i = 0; i < times; i++) {
        if (ayahStopRef.current || !isSessionCurrent(session)) break;

        if (useSync && pack && verseTiming) {
          const result = await playClipToEnd(audio, pack.audioUrl, {
            shouldStop: () =>
              ayahStopRef.current || !isSessionCurrent(session),
            startAtSec: verseTiming.timestampFrom / 1000,
            stopAtSec: verseTiming.timestampTo / 1000,
            session,
            isCurrent: isSessionCurrent,
            onTime: (currentTime) => {
              const ms = currentTime * 1000;
              const seg = verseTiming.segments.find(
                (s) => ms >= s.startMs && ms < s.endMs,
              );
              if (seg) {
                setSyncHighlightPos(seg.position);
                onHighlightWord({
                  surahId: target.surahId,
                  verse: target.verseNumber,
                  position: seg.position,
                });
              }
            },
          });

          if (
            result === "error" &&
            !ayahStopRef.current &&
            isSessionCurrent(session)
          ) {
            await playUrlUntilEnd(
              audio,
              ayahAudioUrl(
                target.surahId,
                target.verseNumber,
                resolvedReciterId,
              ),
              () => ayahStopRef.current || !isSessionCurrent(session),
              1,
              session,
              isSessionCurrent,
            );
          }
        } else {
          await playUrlUntilEnd(
            audio,
            ayahAudioUrl(
              target.surahId,
              target.verseNumber,
              resolvedReciterId,
            ),
            () => ayahStopRef.current || !isSessionCurrent(session),
            1,
            session,
            isSessionCurrent,
          );
        }
      }
    } catch {
      failed = true;
      onStatusNote("playError", undefined, 2000);
    } finally {
      setAudioPlaying(false);
      setSyncHighlightPos(null);
      clearMediaSession();
      if (!ayahStopRef.current && !failed && isSessionCurrent(session)) {
        onStatusNote(null);
      }
    }
  };

  const playWordByWordAudio = async () => {
    const { start, session } = beginExclusive("wbw");
    if (!start) return;

    const target = resolveAyahTarget();
    if (!target) {
      stopAllAudio();
      return;
    }

    const words = verseWords(page, target.surahId, target.verseNumber);
    if (!words.length) {
      onStatusNote("needWord", undefined, 2200);
      stopAllAudio();
      return;
    }

    const audio = audioRef.current!;
    const times = Math.max(1, Math.min(10, repeatCount));

    onStatusNote("wbwPlaying");
    setMediaSessionPlaying(
      {
        title: tAudio("mediaSessionWbw", { verseKey: target.verseKey }),
        artist: reciterArtist(resolvedReciterId),
      },
      mediaStopHandlers(session, "wbw"),
    );

    let failed = false;
    try {
      for (let round = 0; round < times; round++) {
        if (wbwStopRef.current || !isSessionCurrent(session)) break;
        for (const word of words) {
          if (wbwStopRef.current || !isSessionCurrent(session)) break;
          onSelectWord(target.surahId, target.verseNumber, word.position);
          await playUrlUntilEnd(
            audio,
            wordAudioUrl(target.surahId, target.verseNumber, word.position),
            () => wbwStopRef.current || !isSessionCurrent(session),
            1,
            session,
            isSessionCurrent,
          );
        }
      }
    } catch {
      failed = true;
      onStatusNote("wbwError", undefined, 2000);
    } finally {
      setWbwPlaying(false);
      clearMediaSession();
      if (!wbwStopRef.current && !failed && isSessionCurrent(session)) {
        onStatusNote(null);
      }
    }
  };

  const playSurahAudio = async (
    surahId: number,
    versesCount: number,
    fromVerse = 1,
    title = "",
  ) => {
    if (!surahId || versesCount < 1) {
      onStatusNote("surahResolveError", undefined, 2200);
      return;
    }

    const { start, session } = beginExclusive("surah");
    if (!start) return;

    const audio = audioRef.current!;
    const startVerse = Math.max(1, Math.min(fromVerse, versesCount));
    const times = Math.max(1, Math.min(10, repeatCount));
    const label = title || tAudio("surahFallbackLabel", { surahId });

    surahMetaRef.current = {
      surahId,
      versesCount,
      fromVerse: startVerse,
      title: label,
    };

    setSurahPlayer({
      active: true,
      playing: true,
      pinned: pinnedRef.current,
      surahId,
      title: label,
      currentTime: 0,
      duration: 0,
      playbackRate: rateRef.current,
      mode: "verses",
      verseIndex: startVerse,
      versesCount,
    });

    onStatusNote("surahPlayingFrom", { verse: startVerse });
    setMediaSessionPlaying(
      {
        title: label,
        artist: reciterArtist(resolvedReciterId),
      },
      {
        onPlay: () => {
          if (modeRef.current !== "surah" || !isSessionCurrent(session)) return;
          surahPausedRef.current = false;
          void audioRef.current?.play().catch(() => undefined);
          setSurahPlayer((p) => ({ ...p, playing: true }));
          setMediaSessionPlaying({
            title: label,
            artist: reciterArtist(resolvedReciterId),
          });
        },
        onPause: () => {
          if (modeRef.current !== "surah" || !isSessionCurrent(session)) return;
          surahPausedRef.current = true;
          audioRef.current?.pause();
          setSurahPlayer((p) => ({ ...p, playing: false }));
          setMediaSessionPaused();
        },
        onStop: () => {
          if (modeRef.current !== "surah" || !isSessionCurrent(session)) return;
          stopAllAudio();
        },
      },
    );

    const pack = await resolveTimings(surahId, resolvedReciterId);
    if (!isSessionCurrent(session) || surahStopRef.current) {
      setSurahPlaying(false);
      clearMediaSession();
      return;
    }

    let failed = false;
    let playedAny = false;

    const waitWhilePaused = async () => {
      while (surahPausedRef.current && !surahStopRef.current) {
        await new Promise((r) => setTimeout(r, 120));
      }
    };

    const shouldStopSurah = () =>
      surahStopRef.current || !isSessionCurrent(session);

    try {
      if (pack?.audioUrl) {
        setSurahPlayer((p) => ({
          ...p,
          mode: "chapter",
          active: true,
          playing: true,
        }));

        for (let round = 0; round < times; round++) {
          if (shouldStopSurah()) break;
          await waitWhilePaused();
          if (shouldStopSurah()) break;

          const fromKey = `${surahId}:${startVerse}`;
          const startTiming = pack.verses[fromKey];
          const startAtSec = startTiming
            ? startTiming.timestampFrom / 1000
            : undefined;

          const result = await playClipToEnd(audio, pack.audioUrl, {
            shouldStop: shouldStopSurah,
            playbackRate: rateRef.current,
            startAtSec,
            session,
            isCurrent: isSessionCurrent,
            onTime: (currentTime, duration) => {
              const ms = currentTime * 1000;
              const hit = verseTimingAt(pack.verses, ms);
              if (hit?.segment) {
                const { surahId: sid, verse } = parseVerseKey(hit.timing.verseKey);
                setSyncHighlightPos(hit.segment.position);
                onHighlightWord({
                  surahId: sid,
                  verse,
                  position: hit.segment.position,
                });
                setSurahPlayer((p) => ({
                  ...p,
                  verseIndex: verse,
                }));
              }
              setSurahPlayer((p) => ({
                ...p,
                currentTime,
                duration: Number.isFinite(duration) ? duration : p.duration,
                playing: !audio.paused,
              }));
            },
          });

          if (result === "error") {
            failed = !playedAny;
            break;
          }
          playedAny = true;
        }
      } else {
        for (let round = 0; round < times; round++) {
          if (shouldStopSurah()) break;
          for (let v = startVerse; v <= versesCount; v++) {
            if (shouldStopSurah()) break;
            await waitWhilePaused();
            if (shouldStopSurah()) break;

            setSurahPlayer((p) => ({
              ...p,
              mode: "verses",
              verseIndex: v,
              playing: true,
              active: true,
            }));

            const result = await playUrlUntilEnd(
              audio,
              ayahAudioUrl(surahId, v, resolvedReciterId),
              shouldStopSurah,
              rateRef.current,
              session,
              isSessionCurrent,
            );

            setSurahPlayer((p) => ({
              ...p,
              currentTime: audio.currentTime,
              duration: Number.isFinite(audio.duration) ? audio.duration : 0,
              playing: !audio.paused,
            }));

            if (result === "error") {
              if (!playedAny) {
                failed = true;
                onStatusNote("surahConnectionError", undefined, 2500);
              }
              break;
            }
            playedAny = true;
          }
          if (failed) break;
        }
      }
    } catch {
      failed = true;
      onStatusNote("surahPlayError", undefined, 2000);
    } finally {
      setSurahPlaying(false);
      setSyncHighlightPos(null);
      setSurahPlayer((p) =>
        p.pinned || pinnedRef.current
          ? { ...p, playing: false, active: true }
          : { ...emptyPlayer, pinned: false },
      );
      if (!(pinnedRef.current || surahPausedRef.current)) {
        clearMediaSession();
      } else {
        setMediaSessionPaused();
      }
      if (!surahStopRef.current && !failed && isSessionCurrent(session)) {
        onStatusNote(null);
      }
      if (failed && !playedAny) {
        clearMediaSession();
        setSurahPlayer(emptyPlayer);
      }
    }
  };

  const pauseSurah = () => {
    surahPausedRef.current = true;
    audioRef.current?.pause();
    setSurahPlayer((p) => ({ ...p, playing: false }));
    setMediaSessionPaused();
  };

  const resumeSurah = () => {
    if (!surahPlaying) {
      const meta = surahMetaRef.current;
      if (meta) {
        void playSurahAudio(
          meta.surahId,
          meta.versesCount,
          meta.fromVerse,
          meta.title,
        );
      }
      return;
    }
    surahPausedRef.current = false;
    void audioRef.current?.play().catch(() => undefined);
    setSurahPlayer((p) => ({ ...p, playing: true }));
    const meta = surahMetaRef.current;
    setMediaSessionPlaying({
      title: meta?.title || tAudio("mediaSessionSurahFallback"),
      artist: reciterArtist(resolvedReciterId),
    });
  };

  const seekSurah = (time: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(time)) return;
    try {
      audio.currentTime = Math.max(0, time);
      setSurahPlayer((p) => ({ ...p, currentTime: audio.currentTime }));
    } catch {
      /* ignore */
    }
  };

  const setSurahRate = (rate: number) => {
    const next = Math.min(2, Math.max(0.75, rate));
    rateRef.current = next;
    if (audioRef.current) audioRef.current.playbackRate = next;
    setSurahPlayer((p) => ({ ...p, playbackRate: next }));
  };

  const setSurahPinned = (pinned: boolean) => {
    pinnedRef.current = pinned;
    setSurahPlayer((p) => ({ ...p, pinned }));
  };

  const closeSurahPlayer = () => {
    stopAllAudio();
    pinnedRef.current = false;
    setSurahPlayer(emptyPlayer);
  };

  return {
    audioPlaying,
    wbwPlaying,
    surahPlaying,
    syncHighlightPos,
    surahPlayer,
    stopAllAudio,
    playAyahAudio,
    playWordByWordAudio,
    playSurahAudio,
    pauseSurah,
    resumeSurah,
    seekSurah,
    setSurahRate,
    setSurahPinned,
    closeSurahPlayer,
  };
}
