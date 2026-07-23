"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  IrabWord,
  QuranWord,
  TafsirSource,
  TafsirSurah,
  VerseTranslationEdition,
} from "@/lib/types";
import { formatVerseKey } from "@/lib/format";
import { normalizeForHafsFont } from "@/lib/quran-text";
import { formatFeatureLabels, formatPosLabels } from "@/lib/morph-labels";
import { lexiconCardLines, narrativeIrab } from "@/lib/irab-narrative";

type MeaningLang = "ar" | "en" | "id" | "ur";

type Props = {
  verseKey: string;
  word: QuranWord;
  morph: IrabWord | null | undefined;
  meaningLang: MeaningLang;
  onMeaningLang: (lang: MeaningLang) => void;
  verseEditions: VerseTranslationEdition[];
  verseEdition: string;
  onVerseEdition: (slug: string) => void;
  verseTranslation: string | null;
  tafsirSources?: TafsirSource[];
};

/** Visible study layers — balāgha deferred (see docs/DEVELOPMENT.md). */
const LAYERS: { id: string; label: string; hint: string }[] = [
  {
    id: "syntax",
    label: "إعراب",
    hint: "موقع الكلمة وإعرابها في سياق الآية",
  },
  {
    id: "morph",
    label: "صرف ومعجم",
    hint: "الجذر والمادة والخصائص الصرفية",
  },
  {
    id: "translation",
    label: "ترجمة ودلالة",
    hint: "معنى الكلمة الدراسي وترجمة الآية",
  },
  {
    id: "tafsir",
    label: "تفسير",
    hint: "شرح الآية من التفسير المختار",
  },
];

const MEANING_LABELS: { id: MeaningLang; label: string }[] = [
  { id: "ar", label: "عربي" },
  { id: "en", label: "EN" },
  { id: "id", label: "ID" },
  { id: "ur", label: "UR" },
];

function wordMeaning(word: QuranWord, lang: MeaningLang): string {
  if (lang === "ar") return word.meaningAr || word.meaning || "";
  if (lang === "id") return word.meaningId || word.meaning || "";
  if (lang === "ur") return word.meaningUr || word.meaning || "";
  return word.meaning || "";
}

function parseVerseKey(verseKey: string): { surahId: number; verse: number } {
  const [s, v] = verseKey.split(":").map(Number);
  return { surahId: s || 1, verse: v || 1 };
}

export function WordStudyDock({
  verseKey,
  word,
  morph,
  meaningLang,
  onMeaningLang,
  verseEditions,
  verseEdition,
  onVerseEdition,
  verseTranslation,
  tafsirSources = [],
}: Props) {
  const [layer, setLayer] = useState("syntax");
  const [tafsirSlug, setTafsirSlug] = useState(tafsirSources[0]?.slug ?? "");
  const [tafsirText, setTafsirText] = useState<string | null>(null);
  const [tafsirLoading, setTafsirLoading] = useState(false);

  const qacNarrative = narrativeIrab(morph ?? null);
  const lexicon = lexiconCardLines(morph ?? null);
  const featureLabels = formatFeatureLabels(morph?.features);
  const posLabels = formatPosLabels(morph?.pos, morph?.features);

  const morphChips = useMemo(() => {
    const chips: { key: string; node: ReactNode }[] = [];
    if (morph?.root) {
      chips.push({
        key: "root",
        node: (
          <Link
            href={`/root/${encodeURIComponent(morph.root)}`}
            className="morph-chip"
          >
            جذر: {morph.root}
          </Link>
        ),
      });
    }
    if (morph?.lemma) {
      chips.push({
        key: "lemma",
        node: <span className="morph-chip">مادة: {morph.lemma}</span>,
      });
    }
    if (posLabels) {
      chips.push({
        key: "pos",
        node: <span className="morph-chip">{posLabels}</span>,
      });
    }
    if (featureLabels) {
      chips.push({
        key: "feat",
        node: <span className="morph-chip">{featureLabels}</span>,
      });
    }
    return chips;
  }, [morph, posLabels, featureLabels]);

  const lexiconExtra = useMemo(() => {
    const shown = new Set<string>();
    if (morph?.lemma) shown.add(`المادة: ${morph.lemma}`);
    if (morph?.root) shown.add(`الجذر: ${morph.root}`);
    if (posLabels) shown.add(`التصنيف: ${posLabels}`);
    return lexicon.filter((line) => !shown.has(line));
  }, [lexicon, morph, posLabels]);

  useEffect(() => {
    if (tafsirSources.length && !tafsirSlug) {
      setTafsirSlug(tafsirSources[0].slug);
    }
  }, [tafsirSources, tafsirSlug]);

  useEffect(() => {
    if (layer !== "tafsir" || !tafsirSlug) return;
    const { surahId, verse } = parseVerseKey(verseKey);
    let cancelled = false;
    setTafsirLoading(true);
    setTafsirText(null);
    (async () => {
      try {
        const res = await fetch(`/api/tafsir/${tafsirSlug}/${surahId}`);
        if (!res.ok) throw new Error("tafsir");
        const data = (await res.json()) as TafsirSurah;
        const hit = data.verses?.find((v) => v.verseNumber === verse);
        if (!cancelled) setTafsirText(hit?.text?.trim() || "لا يتوفر تفسير لهذه الآية في هذا المصدر.");
      } catch {
        if (!cancelled) setTafsirText("تعذّر تحميل التفسير.");
      } finally {
        if (!cancelled) setTafsirLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [layer, tafsirSlug, verseKey]);

  const { surahId: dockSurahId, verse: dockVerse } = useMemo(
    () => parseVerseKey(verseKey),
    [verseKey],
  );

  return (
    <section className="word-dock" aria-live="polite">
      <div className="word-dock-head">
        <span className="word-dock-key">{formatVerseKey(verseKey)}</span>
        <p className="word-dock-ar">{normalizeForHafsFont(word.text)}</p>
        {word.transliteration ? (
          <p className="word-dock-tr">{word.transliteration}</p>
        ) : null}
        <nav className="word-dock-links" aria-label="روابط الدراسة">
          <Link
            href={`/ayah/${dockSurahId}/${dockVerse}`}
            className="word-dock-link"
          >
            إعراب الآية كاملة
          </Link>
          {morph?.root ? (
            <Link
              href={`/root/${encodeURIComponent(morph.root)}`}
              className="word-dock-link"
            >
              جذر «{morph.root}»
            </Link>
          ) : null}
        </nav>
      </div>

      <div className="layer-rail" role="tablist" aria-label="طبقات تحليل الكلمة">
        {LAYERS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={layer === l.id}
            className={`layer-chip ${layer === l.id ? "is-active" : ""}`}
            onClick={() => setLayer(l.id)}
          >
            {l.label}
          </button>
        ))}
      </div>

      <article className="analysis-card is-ready layer-panel">
        {layer === "syntax" ? (
          <>
            <h3>الإعراب</h3>
            <p className="layer-hint">
              {LAYERS.find((l) => l.id === "syntax")?.hint}
            </p>
            <p>{qacNarrative}</p>
          </>
        ) : null}

        {layer === "morph" ? (
          <>
            <h3>الصرف والمعجم</h3>
            <p className="layer-hint">
              {LAYERS.find((l) => l.id === "morph")?.hint}
            </p>
            <div className="morph-facts morph-facts--inline">
              {morphChips.map((c) => (
                <span key={c.key}>{c.node}</span>
              ))}
            </div>
            {lexiconExtra.length ? (
              <ul className="lexicon-list">
                {lexiconExtra.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
            {!morphChips.length && !lexiconExtra.length ? <p>—</p> : null}
            {morph?.root ? (
              <p>
                <Link href={`/root/${encodeURIComponent(morph.root)}`}>
                  مواضع الجذر «{morph.root}» في القرآن
                </Link>
              </p>
            ) : null}
          </>
        ) : null}

        {layer === "translation" ? (
          <>
            <h3>الترجمة والدلالة</h3>
            <p className="layer-hint">
              {LAYERS.find((l) => l.id === "translation")?.hint}
              {meaningLang === "ar"
                ? " — المعنى العربي هنا معنى دراسي مختصر للكلمة."
                : ""}
            </p>
            <div className="lang-switch" role="group" aria-label="لغة معنى الكلمة">
              {MEANING_LABELS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={`lang-chip ${meaningLang === l.id ? "is-active" : ""}`}
                  onClick={() => onMeaningLang(l.id)}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <p className="word-sense">{wordMeaning(word, meaningLang) || "—"}</p>
            {verseEditions.length ? (
              <>
                <h4 className="layer-subhead">ترجمة الآية</h4>
                <select
                  className="verse-trans-select"
                  value={verseEdition}
                  onChange={(e) => onVerseEdition(e.target.value)}
                  aria-label="اختر ترجمة الآية"
                >
                  {verseEditions.map((e) => (
                    <option key={e.slug} value={e.slug}>
                      {e.nameAr}
                    </option>
                  ))}
                </select>
                <p className="verse-trans-body" dir="auto">
                  {verseTranslation || "جارٍ التحميل…"}
                </p>
              </>
            ) : null}
          </>
        ) : null}

        {layer === "tafsir" ? (
          <>
            <h3>التفسير</h3>
            <p className="layer-hint">
              {LAYERS.find((l) => l.id === "tafsir")?.hint}
            </p>
            {tafsirSources.length ? (
              <>
                <select
                  className="verse-trans-select"
                  value={tafsirSlug}
                  onChange={(e) => setTafsirSlug(e.target.value)}
                  aria-label="اختر التفسير"
                >
                  {tafsirSources.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.nameAr}
                    </option>
                  ))}
                </select>
                <p className="tafsir-dock-body" dir="rtl">
                  {tafsirLoading ? "جارٍ التحميل…" : tafsirText || "—"}
                </p>
              </>
            ) : (
              <p>لا تتوفر تفاسير محمّلة.</p>
            )}
          </>
        ) : null}
      </article>
    </section>
  );
}
