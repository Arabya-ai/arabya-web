"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
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
import { upsertStudyEntry } from "@/lib/study-archive";
import { QAC_IRAB_SOURCE } from "@/lib/claims";
import { nextTabIndex } from "@/lib/tablist";

type MeaningLang = "ar" | "en" | "id" | "ur";

export type VerseTranslationStatus = "idle" | "loading" | "ready" | "error" | "empty";

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
  verseTranslationStatus?: VerseTranslationStatus;
  tafsirSources?: TafsirSource[];
  /** From IrabSurah for the selected word's surah */
  irabSource?: string | null;
  irabSourceUrl?: string | null;
  irabLicense?: string | null;
};

const LAYERS: { id: string; label: string; hint: string }[] = [
  {
    id: "syntax",
    label: "إعراب",
    hint: "موقع الكلمة النحوي في سياق الآية — مبني على صرف المدونة مع صياغة دراسية",
  },
  {
    id: "morph",
    label: "صرف ومعجم",
    hint: "الجذر والمادة والخصائص الصرفية وخطوط المعجم المختصرة",
  },
  {
    id: "translation",
    label: "ترجمة ودلالة",
    hint: "معنى الكلمة الدراسي ثم ترجمة الآية المختارة",
  },
  {
    id: "tafsir",
    label: "تفسير الآية",
    hint: "نص التفسير للآية الحالية فقط — لتفسير الصفحة كاملة استخدم أوضاع العرض أسفل اللوحة",
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

function meaningSourceHint(lang: MeaningLang): string {
  if (lang === "ar") {
    return "معنى دراسي مختصر مشتق من المادة (lemma-sense) — ليس ترجمة حرفية كاملة";
  }
  return "معنى كلمة بكلمة عبر Quran.com WBW";
}

function parseVerseKey(verseKey: string): { surahId: number; verse: number } {
  const [s, v] = verseKey.split(":").map(Number);
  return { surahId: s || 1, verse: v || 1 };
}

function SourceLine({
  label,
  href,
  extra,
}: {
  label: string;
  href?: string | null;
  extra?: string | null;
}) {
  return (
    <p className="layer-source">
      <span className="layer-source-label">المصدر:</span>{" "}
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      ) : (
        label
      )}
      {extra ? <span className="layer-source-extra"> · {extra}</span> : null}
    </p>
  );
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
  verseTranslationStatus = "idle",
  tafsirSources = [],
  irabSource,
  irabSourceUrl,
  irabLicense,
}: Props) {
  const [layer, setLayer] = useState("syntax");
  const [tafsirSlug, setTafsirSlug] = useState(tafsirSources[0]?.slug ?? "");
  const [tafsirText, setTafsirText] = useState<string | null>(null);
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  useEffect(() => {
    const { surahId, verse } = parseVerseKey(verseKey);
    const text = word.text || "";
    if (!text) return;
    upsertStudyEntry({
      kind: "word",
      title: text,
      surahId,
      verse,
      wordIndex: word.position,
      snippet: wordMeaning(word, "ar") || undefined,
      href: `/ayah/${surahId}/${verse}`,
    });
  }, [verseKey, word]);

  const qacNarrative = narrativeIrab(morph ?? null);
  const lexicon = lexiconCardLines(morph ?? null);
  const featureLabels = formatFeatureLabels(morph?.features);
  const posLabels = formatPosLabels(morph?.pos, morph?.features);
  const hasMorphPayload = Boolean(
    morph &&
      (morph.root ||
        morph.lemma ||
        morph.pos?.length ||
        morph.features?.length ||
        morph.irab ||
        morph.irabText),
  );

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
        if (!cancelled) {
          setTafsirText(
            hit?.text?.trim() || "لا يتوفر تفسير لهذه الآية في هذا المصدر.",
          );
        }
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

  const activeEdition = verseEditions.find((e) => e.slug === verseEdition);
  const activeTafsirMeta = tafsirSources.find((s) => s.slug === tafsirSlug);
  const syntaxSourceLabel = irabSource?.trim() || QAC_IRAB_SOURCE.label;
  const syntaxSourceUrl = irabSourceUrl || QAC_IRAB_SOURCE.url;
  const syntaxLicense = irabLicense || QAC_IRAB_SOURCE.license;

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextTabIndex(e.key, index, LAYERS.length);
    if (next === null) return;
    e.preventDefault();
    setLayer(LAYERS[next].id);
    tabRefs.current[next]?.focus();
  };

  const sense = wordMeaning(word, meaningLang);
  const panelId = `${baseId}-panel`;

  let verseTransBody: string;
  if (verseTranslationStatus === "loading" || verseTranslationStatus === "idle") {
    verseTransBody = "جارٍ التحميل…";
  } else if (verseTranslationStatus === "error") {
    verseTransBody = "تعذّر تحميل ترجمة الآية — جرّب طبعة أخرى أو أعد المحاولة.";
  } else if (verseTranslation?.trim()) {
    verseTransBody = verseTranslation;
  } else {
    verseTransBody = "لا تتوفر ترجمة لهذه الآية في الطبعة المختارة.";
  }

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
        {LAYERS.map((l, i) => {
          const active = layer === l.id;
          return (
            <button
              key={l.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${l.id}`}
              aria-selected={active}
              aria-controls={panelId}
              tabIndex={active ? 0 : -1}
              className={`layer-chip ${active ? "is-active" : ""}`}
              onClick={() => setLayer(l.id)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
            >
              {l.label}
            </button>
          );
        })}
        <span
          className="layer-chip layer-chip--soon"
          title="طبقة البلاغة مؤجّلة حتى توفر مصادر مرخّصة"
        >
          بلاغة · قريبًا
        </span>
      </div>

      <article
        className="analysis-card is-ready layer-panel"
        role="tabpanel"
        id={panelId}
        aria-labelledby={`${baseId}-tab-${layer}`}
        tabIndex={0}
      >
        {layer === "syntax" ? (
          <>
            <h3>إعراب الكلمة</h3>
            <p className="layer-hint">
              {LAYERS.find((l) => l.id === "syntax")?.hint}
            </p>
            {hasMorphPayload && qacNarrative && qacNarrative !== "—" ? (
              <p className="layer-body">{qacNarrative}</p>
            ) : (
              <p className="layer-empty">
                لا تتوفر بيانات إعراب لهذه الكلمة في الصفحة الحالية.
                {dockSurahId ? (
                  <>
                    {" "}
                    <Link href={`/ayah/${dockSurahId}/${dockVerse}`}>
                      افتح إعراب الآية كاملة
                    </Link>
                  </>
                ) : null}
              </p>
            )}
            <SourceLine
              label={syntaxSourceLabel}
              href={syntaxSourceUrl}
              extra={syntaxLicense}
            />
          </>
        ) : null}

        {layer === "morph" ? (
          <>
            <h3>الصرف والمعجم</h3>
            <p className="layer-hint">
              {LAYERS.find((l) => l.id === "morph")?.hint}
            </p>
            {morphChips.length || lexiconExtra.length ? (
              <>
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
              </>
            ) : (
              <p className="layer-empty">
                لا تتوفر خصائص صرفية أو معجمية لهذه الكلمة بعد.
                {morph?.root ? null : " قد تكون أداةً أو ضميرًا بلا جذر مستقل."}
              </p>
            )}
            {morph?.root ? (
              <p>
                <Link href={`/root/${encodeURIComponent(morph.root)}`}>
                  مواضع الجذر «{morph.root}» في القرآن
                </Link>
              </p>
            ) : null}
            <SourceLine
              label={syntaxSourceLabel}
              href={syntaxSourceUrl}
              extra="صرف المدونة القرآنية"
            />
          </>
        ) : null}

        {layer === "translation" ? (
          <>
            <h3>الترجمة والدلالة</h3>
            <p className="layer-hint">
              {LAYERS.find((l) => l.id === "translation")?.hint}
            </p>

            <h4 className="layer-subhead">معنى الكلمة</h4>
            <p className="layer-hint layer-hint--tight">
              {meaningSourceHint(meaningLang)}
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
            {sense ? (
              <p className="word-sense">{sense}</p>
            ) : (
              <p className="layer-empty">لا يتوفر معنى لهذه الكلمة بهذه اللغة.</p>
            )}

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
                <p
                  className={`verse-trans-body${
                    verseTranslationStatus === "error" ? " is-error" : ""
                  }`}
                  dir="auto"
                >
                  {verseTransBody}
                </p>
                {activeEdition ? (
                  <SourceLine
                    label={
                      activeEdition.source
                        ? `${activeEdition.nameAr} — ${activeEdition.source}`
                        : activeEdition.nameAr
                    }
                    href={activeEdition.sourceUrl}
                  />
                ) : null}
              </>
            ) : null}
          </>
        ) : null}

        {layer === "tafsir" ? (
          <>
            <h3>تفسير الآية</h3>
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
                {activeTafsirMeta ? (
                  <SourceLine
                    label={
                      activeTafsirMeta.source
                        ? `${activeTafsirMeta.nameAr} — ${activeTafsirMeta.source}`
                        : activeTafsirMeta.nameAr
                    }
                    href={activeTafsirMeta.sourceUrl}
                  />
                ) : null}
              </>
            ) : (
              <p className="layer-empty">لا تتوفر تفاسير محمّلة في هذه النسخة.</p>
            )}
          </>
        ) : null}
      </article>
    </section>
  );
}
