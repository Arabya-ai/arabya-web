"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiGet } from "@/lib/api-client";
import type {
  TafsirSurah,
  VerseTranslationEdition,
  VerseTranslationSurah,
} from "@/lib/types";
import type { MushafPageContent } from "@/lib/mushaf";

type Mode = string;

type SelectedVerse = {
  surahId: number;
  verseNumber: number;
} | null;

/** Pure helper — exported for unit tests. */
export function missingCacheKeys(
  surahIds: number[],
  cache: Record<string, unknown>,
  prefix: string,
): number[] {
  return surahIds.filter((id) => cache[`${prefix}:${id}`] === undefined);
}

export function useMushafStudyCache({
  mode,
  page,
  verseEdition,
  verseEditions,
  selected,
}: {
  mode: Mode;
  page: MushafPageContent;
  verseEdition: string;
  verseEditions: VerseTranslationEdition[];
  selected: SelectedVerse;
}) {
  const [tafsirCache, setTafsirCache] = useState<
    Record<string, TafsirSurah | null>
  >({});
  const [transCache, setTransCache] = useState<
    Record<string, VerseTranslationSurah | null>
  >({});
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [transLoading, setTransLoading] = useState(false);

  const tafsirCacheRef = useRef(tafsirCache);
  const transCacheRef = useRef(transCache);
  const tafsirInflightRef = useRef<
    Record<string, Promise<TafsirSurah | null>>
  >({});
  tafsirCacheRef.current = tafsirCache;
  transCacheRef.current = transCache;

  const pageVerseKeys = useMemo(
    () => new Set(page.blocks.flatMap((b) => b.verses.map((v) => v.verseKey))),
    [page.blocks],
  );

  const surahIdsKey = useMemo(
    () =>
      [...new Set(page.blocks.map((b) => b.surahId))]
        .sort((a, b) => a - b)
        .join(","),
    [page.blocks],
  );

  const activeTafsir =
    mode !== "words" && mode !== "irab" && mode !== "meaning-table"
      ? mode
      : null;

  /** Shared fetch — page panels and word dock use the same in-memory cache. */
  const ensureTafsirSurah = useCallback(
    async (slug: string, surahId: number): Promise<TafsirSurah | null> => {
      const key = `${slug}:${surahId}`;
      if (tafsirCacheRef.current[key] !== undefined) {
        return tafsirCacheRef.current[key];
      }
      const inflight = tafsirInflightRef.current[key];
      if (inflight) return inflight;

      const promise = (async () => {
        try {
          const res = await apiGet(`/api/tafsir/${slug}/${surahId}`);
          if (!res.ok) {
            setTafsirCache((prev) => ({ ...prev, [key]: null }));
            tafsirCacheRef.current = { ...tafsirCacheRef.current, [key]: null };
            return null;
          }
          const data = (await res.json()) as TafsirSurah;
          setTafsirCache((prev) => ({ ...prev, [key]: data }));
          tafsirCacheRef.current = { ...tafsirCacheRef.current, [key]: data };
          return data;
        } catch {
          setTafsirCache((prev) => ({ ...prev, [key]: null }));
          tafsirCacheRef.current = { ...tafsirCacheRef.current, [key]: null };
          return null;
        } finally {
          delete tafsirInflightRef.current[key];
        }
      })();

      tafsirInflightRef.current[key] = promise;
      return promise;
    },
    [],
  );

  useEffect(() => {
    if (!activeTafsir) return;

    const surahIds = surahIdsKey
      ? surahIdsKey.split(",").map(Number)
      : [];
    let cancelled = false;

    (async () => {
      const toFetch = missingCacheKeys(
        surahIds,
        tafsirCacheRef.current,
        activeTafsir,
      );
      if (!toFetch.length) return;

      setTafsirLoading(true);
      try {
        await Promise.all(
          toFetch.map((surahId) => ensureTafsirSurah(activeTafsir, surahId)),
        );
      } finally {
        if (!cancelled) setTafsirLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTafsir, page.page, surahIdsKey, ensureTafsirSurah]);

  useEffect(() => {
    if (!verseEdition || !verseEditions.length) return;
    const surahIds = surahIdsKey
      ? surahIdsKey.split(",").map(Number)
      : [];
    let cancelled = false;

    (async () => {
      const toFetch = missingCacheKeys(
        surahIds,
        transCacheRef.current,
        verseEdition,
      );
      if (!toFetch.length) return;

      setTransLoading(true);
      try {
        const entries = await Promise.all(
          toFetch.map(async (surahId) => {
            try {
              const res = await apiGet(
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
      } finally {
        if (!cancelled) setTransLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [verseEdition, page.page, verseEditions.length, surahIdsKey]);

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

  const selectedVerseTranslationStatus = useMemo(() => {
    if (!selected || !verseEdition) return "idle" as const;
    const key = `${verseEdition}:${selected.surahId}`;
    if (!(key in transCache)) {
      return transLoading ? ("loading" as const) : ("idle" as const);
    }
    const pack = transCache[key];
    if (pack === null) return "error" as const;
    const text = pack.verses.find(
      (v) => v.verseNumber === selected.verseNumber,
    )?.text;
    if (text?.trim()) return "ready" as const;
    return "empty" as const;
  }, [selected, transCache, verseEdition, transLoading]);

  return {
    activeTafsir,
    tafsirRows,
    tafsirLoading,
    selectedVerseTranslation,
    selectedVerseTranslationStatus,
    ensureTafsirSurah,
  };
}
