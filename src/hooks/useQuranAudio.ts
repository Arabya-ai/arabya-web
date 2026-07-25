"use client";

import { useEffect, useRef, useState } from "react";
import {
  ayahAudioUrl,
  getReciter,
  reciterDisplayName,
  wordAudioUrl,
  type VerseTiming,
} from "@/lib/audio";
import { apiGet } from "@/lib/api-client";
import {
  clearMediaSession,
  setMediaSessionPaused,
  setMediaSessionPlaying,
} from "@/lib/media-session";
import type { MushafPageContent } from "@/lib/mushaf";
import type { WordRef } from "@/hooks/mushaf-utils";

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

export type AudioStatusKey =
  | "ayahSyncPlaying"
  | "ayahPlayingNoSync"
  | "playError"
  | "wbwPlaying"
  | "wbwError"
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

function hardStopMedia(audio: HTMLAudioElement | null) {
  if (!audio) return;
  try {
    audio.pause();
    audio.ontimeupdate = null;
    audio.onended = null;
    audio.onerror = null;
    audio.removeAttribute("src");
    audio.load();
  } catch {
    /* ignore */
  }
}

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
  const wbwStopRef = useRef(false);
  const ayahStopRef = useRef(false);
  const surahStopRef = useRef(false);
  const surahPausedRef = useRef(false);
  const pinnedRef = useRef(false);
  const rateRef = useRef(1);
  const surahMetaRef = useRef<{
    surahId: number;
    versesCount: number;
    fromVerse: number;
    title: string;
  } | null>(null);
  const timingsCacheRef = useRef<
    Record<string, { audioUrl: string; verses: Record<string, VerseTiming> }>
  >({});
  const pageNum = page.page;

  const stopAllAudio = () => {
    wbwStopRef.current = true;
    ayahStopRef.current = true;
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

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  useEffect(() => {
    stopAllAudio();
  }, [pageNum, reciterId]);

  const loadChapterTimings = async (surahId: number, rid: string) => {
    const cacheKey = `${rid}:${surahId}`;
    if (timingsCacheRef.current[cacheKey]) {
      return timingsCacheRef.current[cacheKey];
    }
    const reciter = getReciter(rid);
    if (!reciter.quranComChapterReciterId) return null;
    try {
      const res = await apiGet(`/api/audio-timings/${rid}/${surahId}`);
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
    if (audioPlaying || wbwPlaying || surahPlaying) {
      stopAllAudio();
      return;
    }

    ayahStopRef.current = false;
    wbwStopRef.current = true;
    surahStopRef.current = true;
    setWbwPlaying(false);
    setSurahPlaying(false);
    setSurahPlayer(emptyPlayer);
    setAudioPlaying(true);
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    const times = Math.max(1, Math.min(10, repeatCount));
    setMediaSessionPlaying(
      {
        title: tAudio("mediaSessionAyah", {
          verseKey: selected.verseKey || `${selected.surahId}:${selected.verseNumber}`,
        }),
        artist: reciterArtist(reciterId),
      },
      {
        onPause: () => stopAllAudio(),
        onStop: () => stopAllAudio(),
      },
    );

    const pack = await loadChapterTimings(selected.surahId, reciterId);
    if (ayahStopRef.current) {
      setAudioPlaying(false);
      clearMediaSession();
      return;
    }
    const verseKey =
      selected.verseKey || `${selected.surahId}:${selected.verseNumber}`;
    const verseTiming = pack?.verses[verseKey];
    const useSync = Boolean(pack?.audioUrl && verseTiming);

    let failed = false;
    try {
      onStatusNote(
        useSync ? "ayahSyncPlaying" : "ayahPlayingNoSync",
      );

      for (let i = 0; i < times; i++) {
        if (ayahStopRef.current) break;

        if (useSync && pack && verseTiming) {
          const syncOk = await new Promise<boolean>((resolve) => {
            let settled = false;
            const finish = (ok: boolean) => {
              if (settled) return;
              settled = true;
              audio.removeEventListener("timeupdate", onTime);
              audio.removeEventListener("ended", onEnded);
              audio.removeEventListener("error", onError);
              audio.removeEventListener("loadedmetadata", onMeta);
              setSyncHighlightPos(null);
              resolve(ok);
            };
            const onTime = () => {
              if (ayahStopRef.current) {
                audio.pause();
                finish(true);
                return;
              }
              const ms = audio.currentTime * 1000;
              if (ms >= verseTiming.timestampTo - 40) {
                audio.pause();
                finish(true);
                return;
              }
              const seg = verseTiming.segments.find(
                (s) => ms >= s.startMs && ms < s.endMs,
              );
              if (seg) {
                setSyncHighlightPos(seg.position);
                onHighlightWord({
                  surahId: selected.surahId,
                  verse: selected.verseNumber,
                  position: seg.position,
                });
              }
            };
            const onEnded = () => finish(true);
            const onError = () => finish(false);
            const onMeta = () => {
              try {
                audio.currentTime = Math.max(
                  0,
                  verseTiming.timestampFrom / 1000,
                );
              } catch {
                /* ignore */
              }
              void audio.play().catch(() => finish(false));
            };
            audio.addEventListener("timeupdate", onTime);
            audio.addEventListener("ended", onEnded);
            audio.addEventListener("error", onError);
            audio.addEventListener("loadedmetadata", onMeta, { once: true });
            audio.src = pack.audioUrl;
            audio.load();
          });

          if (!syncOk && !ayahStopRef.current) {
            const url = ayahAudioUrl(
              selected.surahId,
              selected.verseNumber,
              reciterId,
            );
            await new Promise<void>((resolve) => {
              const onEnded = () => {
                audio.removeEventListener("ended", onEnded);
                audio.removeEventListener("error", onError);
                resolve();
              };
              const onError = () => {
                audio.removeEventListener("ended", onEnded);
                audio.removeEventListener("error", onError);
                resolve();
              };
              audio.addEventListener("ended", onEnded);
              audio.addEventListener("error", onError);
              audio.src = url;
              void audio.play().catch(() => {
                audio.removeEventListener("ended", onEnded);
                audio.removeEventListener("error", onError);
                resolve();
              });
            });
          }
        } else {
          const url = ayahAudioUrl(
            selected.surahId,
            selected.verseNumber,
            reciterId,
          );
          await new Promise<void>((resolve) => {
            const onEnded = () => {
              audio.removeEventListener("ended", onEnded);
              audio.removeEventListener("error", onError);
              resolve();
            };
            const onError = () => {
              audio.removeEventListener("ended", onEnded);
              audio.removeEventListener("error", onError);
              resolve();
            };
            audio.addEventListener("ended", onEnded);
            audio.addEventListener("error", onError);
            audio.src = url;
            void audio.play().catch(() => {
              audio.removeEventListener("ended", onEnded);
              audio.removeEventListener("error", onError);
              resolve();
            });
          });
        }
      }
    } catch {
      failed = true;
      onStatusNote("playError", undefined, 2000);
    } finally {
      setAudioPlaying(false);
      setSyncHighlightPos(null);
      clearMediaSession();
      if (!ayahStopRef.current && !failed) onStatusNote(null);
    }
  };

  const playWordByWordAudio = async () => {
    if (!selected) return;
    if (wbwPlaying || audioPlaying || surahPlaying) {
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
    ayahStopRef.current = true;
    surahStopRef.current = true;
    setWbwPlaying(true);
    setAudioPlaying(false);
    setSurahPlaying(false);
    setSurahPlayer(emptyPlayer);
    onStatusNote("wbwPlaying");
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    const times = Math.max(1, Math.min(10, repeatCount));
    setMediaSessionPlaying(
      {
        title: tAudio("mediaSessionWbw", { verseKey: selected.verseKey }),
        artist: reciterArtist(reciterId),
      },
      {
        onPause: () => stopAllAudio(),
        onStop: () => stopAllAudio(),
      },
    );

    let failed = false;
    try {
      for (let round = 0; round < times; round++) {
        if (wbwStopRef.current) break;
        for (const word of words) {
          if (wbwStopRef.current) break;
          onSelectWord(selected.surahId, selected.verseNumber, word.position);
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
              resolve();
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
      }
    } catch {
      failed = true;
      onStatusNote("wbwError", undefined, 2000);
    } finally {
      setWbwPlaying(false);
      clearMediaSession();
      if (!wbwStopRef.current && !failed) {
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
    if (surahPlaying || audioPlaying || wbwPlaying) {
      stopAllAudio();
      return;
    }

    surahStopRef.current = false;
    surahPausedRef.current = false;
    ayahStopRef.current = true;
    wbwStopRef.current = true;
    setSurahPlaying(true);
    setAudioPlaying(false);
    setWbwPlaying(false);
    setSyncHighlightPos(null);

    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    const start = Math.max(1, Math.min(fromVerse, versesCount));
    const times = Math.max(1, Math.min(10, repeatCount));
    const label = title || tAudio("surahFallbackLabel", { surahId });
    surahMetaRef.current = { surahId, versesCount, fromVerse: start, title: label };

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
      verseIndex: start,
      versesCount,
    });

    onStatusNote("surahPlayingFrom", { verse: start });
    setMediaSessionPlaying(
      {
        title: label,
        artist: reciterArtist(reciterId),
      },
      {
        onPlay: () => {
          surahPausedRef.current = false;
          void audioRef.current?.play().catch(() => undefined);
          setSurahPlayer((p) => ({ ...p, playing: true }));
          setMediaSessionPlaying({
            title: label,
            artist: reciterArtist(reciterId),
          });
        },
        onPause: () => {
          surahPausedRef.current = true;
          audioRef.current?.pause();
          setSurahPlayer((p) => ({ ...p, playing: false }));
          setMediaSessionPaused();
        },
        onStop: () => stopAllAudio(),
      },
    );

    const pack = await loadChapterTimings(surahId, reciterId);
    if (surahStopRef.current) {
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

    try {
      if (pack?.audioUrl) {
        setSurahPlayer((p) => ({ ...p, mode: "chapter", active: true, playing: true }));
        for (let round = 0; round < times; round++) {
          if (surahStopRef.current) break;
          await waitWhilePaused();
          if (surahStopRef.current) break;

          const ok = await new Promise<boolean>((resolve) => {
            let settled = false;
            const finish = (v: boolean) => {
              if (settled) return;
              settled = true;
              audio.removeEventListener("timeupdate", onTime);
              audio.removeEventListener("ended", onEnded);
              audio.removeEventListener("error", onError);
              audio.removeEventListener("loadedmetadata", onMeta);
              resolve(v);
            };
            const onTime = () => {
              if (surahStopRef.current) {
                audio.pause();
                finish(true);
                return;
              }
              setSurahPlayer((p) => ({
                ...p,
                currentTime: audio.currentTime,
                duration: Number.isFinite(audio.duration) ? audio.duration : p.duration,
                playing: !audio.paused,
              }));
            };
            const onEnded = () => finish(true);
            const onError = () => finish(false);
            const onMeta = () => {
              const fromKey = `${surahId}:${start}`;
              const timing = pack.verses[fromKey];
              if (timing) {
                try {
                  audio.currentTime = Math.max(0, timing.timestampFrom / 1000);
                } catch {
                  /* ignore */
                }
              }
              setSurahPlayer((p) => ({
                ...p,
                duration: Number.isFinite(audio.duration) ? audio.duration : 0,
              }));
              void audio.play().catch(() => finish(false));
            };
            audio.playbackRate = rateRef.current;
            audio.addEventListener("timeupdate", onTime);
            audio.addEventListener("ended", onEnded);
            audio.addEventListener("error", onError);
            audio.addEventListener("loadedmetadata", onMeta, { once: true });
            audio.src = pack.audioUrl;
            audio.load();
          });

          if (!ok) {
            failed = !playedAny;
            break;
          }
          playedAny = true;
        }
      } else {
        for (let round = 0; round < times; round++) {
          if (surahStopRef.current) break;
          for (let v = start; v <= versesCount; v++) {
            if (surahStopRef.current) break;
            await waitWhilePaused();
            if (surahStopRef.current) break;

            setSurahPlayer((p) => ({
              ...p,
              mode: "verses",
              verseIndex: v,
              playing: true,
              active: true,
            }));

            const url = ayahAudioUrl(surahId, v, reciterId);
            const ok = await new Promise<boolean>((resolve) => {
              const onEnded = () => {
                cleanup();
                resolve(true);
              };
              const onError = () => {
                cleanup();
                resolve(false);
              };
              const onTime = () => {
                setSurahPlayer((p) => ({
                  ...p,
                  currentTime: audio.currentTime,
                  duration: Number.isFinite(audio.duration) ? audio.duration : 0,
                  playing: !audio.paused,
                }));
              };
              const cleanup = () => {
                audio.removeEventListener("ended", onEnded);
                audio.removeEventListener("error", onError);
                audio.removeEventListener("timeupdate", onTime);
              };
              audio.addEventListener("ended", onEnded);
              audio.addEventListener("error", onError);
              audio.addEventListener("timeupdate", onTime);
              audio.playbackRate = rateRef.current;
              audio.src = url;
              audio.play().catch(() => {
                cleanup();
                resolve(false);
              });
            });
            if (!ok) {
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
      if (!surahStopRef.current && !failed) onStatusNote(null);
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
      artist: reciterArtist(reciterId),
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
