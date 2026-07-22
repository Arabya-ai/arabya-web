"use client";

import { useEffect, useRef, useState } from "react";
import {
  ayahAudioUrl,
  getReciter,
  wordAudioUrl,
  type VerseTiming,
} from "@/lib/audio";
import type { MushafPageContent } from "@/lib/mushaf";
import type { WordRef } from "@/hooks/mushaf-utils";

type SelectedAyah = {
  surahId: number;
  verseNumber: number;
  verseKey: string;
} | null;

export function useQuranAudio({
  selected,
  reciterId,
  repeatCount,
  page,
  onHighlightWord,
  onSelectWord,
  onStatusNote,
}: {
  selected: SelectedAyah;
  reciterId: string;
  repeatCount: number;
  page: MushafPageContent;
  onHighlightWord: (ref: WordRef) => void;
  onSelectWord: (surahId: number, verse: number, position: number) => void;
  onStatusNote: (note: string | null, clearMs?: number) => void;
}) {
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [wbwPlaying, setWbwPlaying] = useState(false);
  const [syncHighlightPos, setSyncHighlightPos] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wbwStopRef = useRef(false);
  const ayahStopRef = useRef(false);
  const timingsCacheRef = useRef<
    Record<string, { audioUrl: string; verses: Record<string, VerseTiming> }>
  >({});

  useEffect(() => {
    return () => {
      wbwStopRef.current = true;
      audioRef.current?.pause();
    };
  }, []);

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

    let failed = false;
    try {
      setAudioPlaying(true);
      onStatusNote(
        useSync
          ? "تلاوة مع تمييز الكلمات…"
          : "جاري تلاوة الآية… (بدون تمييز كلمات لهذا القارئ)",
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
                onHighlightWord({
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
      failed = true;
      onStatusNote("تعذّر تشغيل الصوت", 2000);
    } finally {
      setAudioPlaying(false);
      setSyncHighlightPos(null);
      if (!ayahStopRef.current && !failed) onStatusNote(null);
    }
  };

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
    onStatusNote("تلاوة كلمة بكلمة…");
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;

    let failed = false;
    try {
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
    } catch {
      failed = true;
      onStatusNote("تعذّر تشغيل التلاوة كلمة بكلمة", 2000);
    } finally {
      setWbwPlaying(false);
      if (!wbwStopRef.current && !failed) {
        onStatusNote(null);
      }
    }
  };

  return {
    audioPlaying,
    wbwPlaying,
    syncHighlightPos,
    stopAllAudio,
    playAyahAudio,
    playWordByWordAudio,
  };
}
