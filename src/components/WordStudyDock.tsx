"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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
  WordSenseEntry,
} from "@/lib/types";
import { formatVerseKey } from "@/lib/format";
import { normalizeForHafsFont } from "@/lib/quran-text";
import { formatFeatureLabels, formatPosLabels } from "@/lib/morph-labels";
import { lexiconCardLines, narrativeIrab } from "@/lib/irab-narrative";
import { upsertStudyEntry } from "@/lib/study-archive";
import { nextTabIndex } from "@/lib/tablist";
import {
  editionDisplayName,
  groupVerseEditionsByLang,
} from "@/lib/translation-label";
import { tafsirDisplayName } from "@/lib/tafsir-label";
import { MeaningLangSwitch } from "@/components/MeaningLangSwitch";
import type { MeaningLang } from "@/hooks/mushaf-utils";
import { studioCreateFromAyahHref } from "@/ayat-studio/lib/studio-paths";
import { apiGet } from "@/lib/api-client";
import type { IrabClaim } from "@/lib/claims";
import { claimsHaveAlternates } from "@/lib/claims";

export type VerseTranslationStatus =
  | "idle"
  | "loading"
  | "ready"
  | "error"
  | "empty";

type Props = {
  verseKey: string;
  word: QuranWord;
  wordId?: string;
  morph: IrabWord | null | undefined;
  /** Rich Arabic sense from quran-words.com when available. */
  senseEntry?: WordSenseEntry | null;
  /** Etymology / lexicon prose resolved for senseEntry.lexiconKey. */
  lexiconText?: string | null;
  meaningLang: MeaningLang;
  onMeaningLang: (lang: MeaningLang) => void;
  verseEditions: VerseTranslationEdition[];
  verseEdition: string;
  onVerseEdition: (slug: string) => void;
  verseTranslation: string | null;
  verseTranslationStatus?: VerseTranslationStatus;
  tafsirSources?: TafsirSource[];
  /** Shared with page-mode tafsir cache — avoids a second network fetch. */
  ensureTafsirSurah: (
    slug: string,
    surahId: number,
  ) => Promise<TafsirSurah | null>;
};

const LAYER_IDS = [
  "syntax",
  "morphology",
  "semantics",
  "lexicon",
  "translation",
  "tafsir",
] as const;

type LayerId = (typeof LAYER_IDS)[number];

function wordMeaning(word: QuranWord, lang: MeaningLang): string {
  if (lang === "ar") return word.meaningAr || word.meaning || "";
  if (lang === "id") return word.meaningId || word.meaning || "";
  if (lang === "ur") return word.meaningUr || word.meaning || "";
  return word.meaning || "";
}

/** quran-words scrapes often wrap senses in markdown-ish backticks. */
function cleanSenseText(text: string): string {
  return String(text || "")
    .replace(/`+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseVerseKey(verseKey: string): { surahId: number; verse: number } {
  const [s, v] = verseKey.split(":").map(Number);
  return { surahId: s || 1, verse: v || 1 };
}

function layerHintKey(id: LayerId): string {
  if (id === "morphology") return "morphologyHint";
  if (id === "semantics") return "semanticsHint";
  if (id === "lexicon") return "lexiconHint";
  if (id === "syntax") return "syntaxHint";
  if (id === "translation") return "translationHint";
  return "tafsirHint";
}

export function WordStudyDock({
  verseKey,
  word,
  wordId,
  morph,
  senseEntry = null,
  lexiconText = null,
  meaningLang,
  onMeaningLang,
  verseEditions,
  verseEdition,
  onVerseEdition,
  verseTranslation,
  verseTranslationStatus = "idle",
  tafsirSources = [],
  ensureTafsirSurah,
}: Props) {
  const t = useTranslations("WordDock");
  const locale = useLocale() === "en" ? "en" : "ar";
  const layers = LAYER_IDS.map((id) => ({
    id,
    label: t(id),
    hint: t(layerHintKey(id) as "syntaxHint"),
  }));
  const [layer, setLayer] = useState<LayerId>("syntax");
  const [tafsirSlug, setTafsirSlug] = useState(tafsirSources[0]?.slug ?? "");
  const [tafsirText, setTafsirText] = useState<string | null>(null);
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [irabClaims, setIrabClaims] = useState<IrabClaim[]>([]);
  const [irabSourceId, setIrabSourceId] = useState("qac");
  const [irabClaimsLoading, setIrabClaimsLoading] = useState(false);
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
      snippet:
        cleanSenseText(senseEntry?.sense || "") ||
        wordMeaning(word, "ar") ||
        undefined,
      href: `/ayah/${surahId}/${verse}`,
    });
  }, [verseKey, word, senseEntry?.sense]);

  useEffect(() => {
    if (!wordId) {
      setIrabClaims([]);
      return;
    }
    let cancelled = false;
    setIrabClaimsLoading(true);
    void (async () => {
      try {
        const res = await apiGet(
          `/api/irab/claims?wordId=${encodeURIComponent(wordId)}&locale=${locale}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as {
          ok?: boolean;
          claims?: IrabClaim[];
        };
        if (cancelled) return;
        const list = data.ok ? data.claims ?? [] : [];
        setIrabClaims(list);
        const qac = list.find((c) => c.sourceId === "qac");
        setIrabSourceId(qac?.sourceId ?? list[0]?.sourceId ?? "qac");
      } catch {
        if (!cancelled) setIrabClaims([]);
      } finally {
        if (!cancelled) setIrabClaimsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wordId, locale]);

  const qacNarrative = narrativeIrab(morph ?? null, locale);
  const lexicon = lexiconCardLines(morph ?? null, locale);
  const featureLabels = formatFeatureLabels(morph?.features, locale);
  const posLabels = formatPosLabels(morph?.pos, morph?.features, locale);

  const selectedIrabClaim = useMemo(
    () =>
      irabClaims.find((c) => c.sourceId === irabSourceId) ??
      irabClaims[0] ??
      null,
    [irabClaims, irabSourceId],
  );
  const irabBody =
    selectedIrabClaim?.text ||
    (irabClaimsLoading ? null : qacNarrative !== "—" ? qacNarrative : null);
  const showIrabSourcePicker =
    irabClaims.length > 1 && claimsHaveAlternates(irabClaims);

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
            {t("morphRootChip", { root: morph.root })}
          </Link>
        ),
      });
    }
    if (morph?.lemma) {
      chips.push({
        key: "lemma",
        node: (
          <span className="morph-chip">
            {t("morphLemmaChip", { lemma: morph.lemma })}
          </span>
        ),
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
  }, [morph, posLabels, featureLabels, t]);

  const lexiconExtra = useMemo(() => {
    const shown = new Set<string>();
    if (morph?.lemma) shown.add(`${t("chipLemma")}: ${morph.lemma}`);
    if (morph?.root) shown.add(`${t("chipRoot")}: ${morph.root}`);
    if (posLabels) shown.add(`${t("chipPos")}: ${posLabels}`);
    return lexicon.filter((line) => !shown.has(line));
  }, [lexicon, morph, posLabels, t]);

  const richSenseAr = cleanSenseText(senseEntry?.sense || "");
  const etymologyText = lexiconText?.trim() || "";

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
        const data = await ensureTafsirSurah(tafsirSlug, surahId);
        if (cancelled) return;
        if (!data) {
          setTafsirText(t("tafsirLoadError"));
          return;
        }
        const hit = data.verses?.find((v) => v.verseNumber === verse);
        setTafsirText(hit?.text?.trim() || t("tafsirEmpty"));
      } catch {
        if (!cancelled) setTafsirText(t("tafsirLoadError"));
      } finally {
        if (!cancelled) setTafsirLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [layer, tafsirSlug, verseKey, ensureTafsirSurah, t]);

  const editionGroups = useMemo(
    () => groupVerseEditionsByLang(verseEditions),
    [verseEditions],
  );

  const { surahId: dockSurahId, verse: dockVerse } = useMemo(
    () => parseVerseKey(verseKey),
    [verseKey],
  );

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextTabIndex(e.key, index, layers.length);
    if (next === null) return;
    e.preventDefault();
    setLayer(layers[next].id);
    tabRefs.current[next]?.focus();
  };

  const fallbackSense = wordMeaning(word, meaningLang);
  const sense =
    meaningLang === "ar" && richSenseAr ? richSenseAr : fallbackSense;
  const panelId = `${baseId}-panel`;

  let verseTransBody: string;
  if (
    verseTranslationStatus === "loading" ||
    verseTranslationStatus === "idle"
  ) {
    verseTransBody = t("loading");
  } else if (verseTranslationStatus === "error") {
    verseTransBody = t("verseTransError");
  } else if (verseTranslation?.trim()) {
    verseTransBody = verseTranslation;
  } else {
    verseTransBody = t("verseTransEmpty");
  }

  const activeHint = layers.find((l) => l.id === layer)?.hint;

  return (
    <section className="word-dock" aria-live="polite">
      <div className="word-dock-head">
        <span className="word-dock-key">{formatVerseKey(verseKey, locale)}</span>
        <p className="word-dock-ar" dir="rtl" lang="ar">
          {normalizeForHafsFont(word.text)}
        </p>
        {word.transliteration ? (
          <p className="word-dock-tr">{word.transliteration}</p>
        ) : null}
        <nav className="word-dock-links" aria-label={t("linksAria")}>
          <Link
            href={`/ayah/${dockSurahId}/${dockVerse}`}
            className="word-dock-link"
          >
            {t("fullIrab")}
          </Link>
          {morph?.root ? (
            <Link
              href={`/root/${encodeURIComponent(morph.root)}`}
              className="word-dock-link"
            >
              {t("rootLink", { root: morph.root })}
            </Link>
          ) : null}
          {dockSurahId && dockVerse ? (
            <>
              <Link
                href={studioCreateFromAyahHref({
                  surahId: dockSurahId,
                  verse: dockVerse,
                  kind: "image",
                })}
                className="word-dock-link"
              >
                {t("createImage")}
              </Link>
              <Link
                href={studioCreateFromAyahHref({
                  surahId: dockSurahId,
                  verse: dockVerse,
                  kind: "video",
                })}
                className="word-dock-link"
              >
                {t("createVideo")}
              </Link>
            </>
          ) : null}
        </nav>
      </div>

      <div className="layer-rail" role="tablist" aria-label={t("layersAria")}>
        {layers.map((l, i) => {
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
            <h3>{t("wordIrabTitle")}</h3>
            <p className="layer-hint">{activeHint}</p>
            {showIrabSourcePicker ? (
              <select
                className="verse-trans-select"
                value={irabSourceId}
                onChange={(e) => setIrabSourceId(e.target.value)}
                aria-label={t("irabSourceSelectAria")}
              >
                {irabClaims.map((c) => (
                  <option key={c.id} value={c.sourceId}>
                    {c.sourceLabel}
                  </option>
                ))}
              </select>
            ) : null}
            {irabClaimsLoading ? (
              <p className="layer-empty">{t("loading")}</p>
            ) : irabBody ? (
              <>
                <p className="layer-body">{irabBody}</p>
                {selectedIrabClaim?.evidence &&
                selectedIrabClaim.evidence !== selectedIrabClaim.text ? (
                  <p className="layer-hint">{selectedIrabClaim.evidence}</p>
                ) : null}
              </>
            ) : (
              <p className="layer-empty">
                {t("noIrab")}
                {dockSurahId ? (
                  <>
                    {" "}
                    <Link href={`/ayah/${dockSurahId}/${dockVerse}`}>
                      {t("fullIrab")}
                    </Link>
                  </>
                ) : null}
              </p>
            )}
          </>
        ) : null}

        {layer === "morphology" ? (
          <>
            <h3>{t("morphologyTitle")}</h3>
            <p className="layer-hint">{activeHint}</p>
            {morphChips.length ? (
              <div className="morph-facts morph-facts--inline">
                {morphChips.map((c) => (
                  <span key={c.key}>{c.node}</span>
                ))}
              </div>
            ) : (
              <p className="layer-empty">
                {t("noMorph")}
                {morph?.root ? null : t("noMorphParticle")}
              </p>
            )}
          </>
        ) : null}

        {layer === "semantics" ? (
          <>
            <h3>{t("semanticsTitle")}</h3>
            <p className="layer-hint">{activeHint}</p>
            <MeaningLangSwitch
              value={meaningLang}
              onChange={onMeaningLang}
              idPrefix="dock-meaning"
              note={t("meaningLangNote")}
            />
            {sense ? (
              <p className="word-sense" dir="auto" lang={meaningLang === "ar" ? "ar" : undefined}>
                {sense}
              </p>
            ) : (
              <p className="layer-empty">{t("noWordTranslation")}</p>
            )}
            {meaningLang === "ar" && richSenseAr && fallbackSense && fallbackSense !== richSenseAr ? (
              <p className="layer-hint word-sense-fallback" dir="rtl" lang="ar">
                {t("shortGlossLabel")}: {fallbackSense}
              </p>
            ) : null}
          </>
        ) : null}

        {layer === "lexicon" ? (
          <>
            <h3>{t("lexiconTitle")}</h3>
            <p className="layer-hint">{activeHint}</p>
            {etymologyText ? (
              <p className="layer-body lexicon-etymology" dir="rtl" lang="ar">
                {etymologyText}
              </p>
            ) : null}
            {lexiconExtra.length ? (
              <ul className="lexicon-list">
                {lexiconExtra.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
            {!etymologyText && !lexiconExtra.length ? (
              <p className="layer-empty">{t("noLexicon")}</p>
            ) : null}
            {morph?.root ? (
              <p>
                <Link href={`/root/${encodeURIComponent(morph.root)}`}>
                  {t("rootOccurrencesInQuran", {
                    root: t("rootLink", { root: morph.root }),
                  })}
                </Link>
              </p>
            ) : null}
          </>
        ) : null}

        {layer === "translation" ? (
          <>
            <h3>{t("translationTitle")}</h3>
            <p className="layer-hint">{activeHint}</p>
            {verseEditions.length ? (
              <>
                <select
                  className="verse-trans-select"
                  value={verseEdition}
                  onChange={(e) => onVerseEdition(e.target.value)}
                  aria-label={t("verseEditionAria")}
                >
                  {editionGroups.map((group) => (
                    <optgroup key={group.lang} label={group.label}>
                      {group.editions.map((e) => (
                        <option key={e.slug} value={e.slug}>
                          {editionDisplayName(e)}
                        </option>
                      ))}
                    </optgroup>
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
              </>
            ) : (
              <p className="layer-empty">{t("verseTransEmpty")}</p>
            )}
          </>
        ) : null}

        {layer === "tafsir" ? (
          <>
            <h3>{t("tafsirTitle")}</h3>
            <p className="layer-hint">{activeHint}</p>
            {tafsirSources.length ? (
              <>
                <select
                  className="verse-trans-select"
                  value={tafsirSlug}
                  onChange={(e) => setTafsirSlug(e.target.value)}
                  aria-label={t("tafsirSelectAria")}
                >
                  {tafsirSources.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {tafsirDisplayName(s, locale)}
                    </option>
                  ))}
                </select>
                <p
                  className="tafsir-dock-body"
                  dir={
                    tafsirSources.find((s) => s.slug === tafsirSlug)?.lang ===
                    "en"
                      ? "ltr"
                      : "rtl"
                  }
                  lang={
                    tafsirSources.find((s) => s.slug === tafsirSlug)?.lang ===
                    "en"
                      ? "en"
                      : "ar"
                  }
                >
                  {tafsirLoading ? t("loading") : tafsirText || "—"}
                </p>
              </>
            ) : (
              <p className="layer-empty">{t("noTafsirSources")}</p>
            )}
          </>
        ) : null}
      </article>
    </section>
  );
}
