"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

  const tafsirCacheRef = useRef(tafsirCache);
  const transCacheRef = useRef(transCache);
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
      } finally {
        if (!cancelled) setTafsirLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTafsir, page.page, surahIdsKey]);

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

  return {
    activeTafsir,
    tafsirRows,
    tafsirLoading,
    selectedVerseTranslation,
  };
}
