"use client";

import { useEffect, useState } from "react";
import type { VerseTranslationEdition } from "@/lib/types";
import { DEFAULT_RECITER_ID, RECITERS } from "@/lib/audio";
import { recordPageRead } from "@/lib/reading-habit";
import {
  FONT_KEY,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
  LAST_PAGE_KEY,
  MEANING_LANG_KEY,
  RECITER_KEY,
  VERSE_TRANS_KEY,
  clampFontScale,
  type MeaningLang,
} from "@/hooks/mushaf-utils";

type PageNav = { page: number; totalPages: number };

export function useMushafPrefs(
  page: PageNav,
  verseEditions: VerseTranslationEdition[],
) {
  const [fontScale, setFontScale] = useState(1);
  const [fontDraft, setFontDraft] = useState("100");
  const [meaningLang, setMeaningLang] = useState<MeaningLang>("ar");
  const [verseEdition, setVerseEdition] = useState(
    () => verseEditions[0]?.slug ?? "saheeh-en",
  );
  const [reciterId, setReciterId] = useState(DEFAULT_RECITER_ID);

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

  const fontPercent = Math.round(fontScale * 100);
  const canShrink = fontScale > FONT_SCALE_MIN + 0.001;
  const canGrow = fontScale < FONT_SCALE_MAX - 0.001;

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

  const persistReciterId = (id: string) => {
    setReciterId(id);
    try {
      localStorage.setItem(RECITER_KEY, id);
    } catch {
      /* ignore */
    }
  };

  return {
    fontScale,
    setFontScale,
    fontDraft,
    setFontDraft,
    fontPercent,
    canShrink,
    canGrow,
    commitFontDraft,
    meaningLang,
    setMeaningLang,
    verseEdition,
    setVerseEdition,
    reciterId,
    persistReciterId,
    FONT_SCALE_MIN,
    FONT_SCALE_MAX,
    FONT_SCALE_STEP,
  };
}
