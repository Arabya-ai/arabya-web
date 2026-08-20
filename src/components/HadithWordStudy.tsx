"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { makeHadithWordId } from "@/lib/word-id";
import { nextTabIndex } from "@/lib/tablist";
import { stripTashkeel } from "@/lib/tahfeez/normalize";
import { formatFeatureLabels, formatPosLabels } from "@/lib/morph-labels";
import { apiGet } from "@/lib/api-client";
import type { HadithWordEnrichment } from "@/lib/hadith-word-enrich";

const LAYER_IDS = [
  "syntax",
  "morphology",
  "semantics",
  "rhetoric",
  "lexicon",
  "translation",
] as const;

type LayerId = (typeof LAYER_IDS)[number];

export type HadithToken = {
  position: number;
  text: string;
  wordId: string;
};

type Props = {
  collection: string;
  number: number;
  arabic: string;
};

function tokenizeMatn(
  collection: string,
  number: number,
  arabic: string,
): HadithToken[] {
  const parts = stripTashkeel(arabic)
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^[^\u0600-\u06FF]+|[^\u0600-\u06FF]+$/g, ""))
    .filter((w) => /[\u0600-\u06FF]/.test(w));

  const raw = arabic
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const tokens: HadithToken[] = [];
  let pos = 1;
  for (const piece of raw) {
    const cleaned = piece
      .replace(/^[^\u0600-\u06FF]+|[^\u0600-\u06FF]+$/g, "")
      .replace(/[\u060C\u061B\u061F\u06D4]+$/g, "");
    if (!/[\u0600-\u06FF]/.test(cleaned)) continue;
    tokens.push({
      position: pos,
      text: cleaned,
      wordId: makeHadithWordId(collection, number, pos),
    });
    pos += 1;
  }

  if (!tokens.length && parts.length) {
    return parts.map((text, i) => ({
      position: i + 1,
      text,
      wordId: makeHadithWordId(collection, number, i + 1),
    }));
  }
  return tokens;
}

function layerHintKey(id: LayerId): string {
  if (id === "morphology") return "morphologyHint";
  if (id === "semantics") return "semanticsHint";
  if (id === "rhetoric") return "rhetoricHint";
  if (id === "lexicon") return "lexiconHint";
  if (id === "syntax") return "syntaxHint";
  return "translationHint";
}

export function HadithWordStudy({ collection, number, arabic }: Props) {
  const t = useTranslations("WordDock");
  const th = useTranslations("Hadith");
  const locale = useLocale() === "en" ? "en" : "ar";
  const tokens = tokenizeMatn(collection, number, arabic);
  const [selected, setSelected] = useState<HadithToken | null>(
    tokens[0] ?? null,
  );
  const [layer, setLayer] = useState<LayerId>("morphology");
  const [enrichment, setEnrichment] = useState<HadithWordEnrichment | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  useEffect(() => {
    if (!selected) {
      setEnrichment(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await apiGet(
          `/api/hadith/word-enrich?text=${encodeURIComponent(selected.text)}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as {
          ok?: boolean;
          enrichment?: HadithWordEnrichment;
        };
        if (!cancelled) {
          setEnrichment(data.ok ? data.enrichment ?? null : null);
        }
      } catch {
        if (!cancelled) setEnrichment(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const layers = LAYER_IDS.map((id) => ({
    id,
    label: t(id),
    hint: t(layerHintKey(id) as "syntaxHint"),
  }));

  function onTabKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = nextTabIndex(e.key, index, layers.length);
    if (next == null) return;
    e.preventDefault();
    setLayer(layers[next].id);
    tabRefs.current[next]?.focus();
  }

  const posLabels = formatPosLabels(enrichment?.pos, enrichment?.features, locale);
  const featureLabels = formatFeatureLabels(enrichment?.features, locale);
  const hasMorph =
    enrichment &&
    (enrichment.root ||
      enrichment.lemma ||
      enrichment.particleLabelAr ||
      (enrichment.pos && enrichment.pos.length > 0));
  const hasSense = Boolean(enrichment?.sense?.trim());
  const hasLexicon = Boolean(enrichment?.lexiconText?.trim());
  const hasRhetoric = Boolean(
    (locale === "en" ? enrichment?.rhetoricEn : enrichment?.rhetoricAr)?.trim(),
  );
  const translationText =
    locale === "en"
      ? enrichment?.translationEn?.trim() || enrichment?.particleLabelEn?.trim()
      : enrichment?.translationAr?.trim() ||
        enrichment?.sense?.trim() ||
        enrichment?.particleLabelAr?.trim();
  const hasTranslation = Boolean(translationText);

  return (
    <div className="hadith-word-study">
      <p className="hadith-word-study-lead">{th("wordStudyLead")}</p>

      <div
        className="hadith-matn-tokens"
        dir="rtl"
        lang="ar"
        role="list"
        aria-label={th("tokensAria")}
      >
        {tokens.map((tok) => {
          const active = selected?.wordId === tok.wordId;
          return (
            <button
              key={tok.wordId}
              type="button"
              className={
                active
                  ? "hadith-token hadith-token--active"
                  : "hadith-token"
              }
              aria-pressed={active}
              onClick={() => setSelected(tok)}
            >
              {tok.text}
            </button>
          );
        })}
      </div>

      {selected ? (
        <section className="word-dock hadith-word-dock" aria-live="polite">
          <header className="word-dock-main">
            <p className="word-dock-key">{selected.wordId}</p>
            <p className="word-dock-ar" dir="rtl" lang="ar">
              {selected.text}
            </p>
            {!loading && enrichment?.sense ? (
              <p className="hadith-sense-preview" dir="rtl" lang="ar">
                {enrichment.sense}
              </p>
            ) : null}
            <p className="layer-hint">{th("wordLayersAnalogyNote")}</p>
          </header>

          <div
            className="layer-rail"
            role="tablist"
            aria-label={t("layersAria")}
          >
            {layers.map((L, index) => {
              const selectedTab = layer === L.id;
              return (
                <button
                  key={L.id}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${L.id}`}
                  aria-selected={selectedTab}
                  aria-controls={`${baseId}-panel-${L.id}`}
                  tabIndex={selectedTab ? 0 : -1}
                  className={`layer-chip ${selectedTab ? "is-active" : ""}`}
                  onClick={() => setLayer(L.id)}
                  onKeyDown={(e) => onTabKeyDown(e, index)}
                >
                  {L.label}
                </button>
              );
            })}
          </div>

          {layers.map((L) =>
            layer === L.id ? (
              <div
                key={L.id}
                role="tabpanel"
                id={`${baseId}-panel-${L.id}`}
                aria-labelledby={`${baseId}-tab-${L.id}`}
                className="hadith-layer-panel"
              >
                <p className="layer-hint">{L.hint}</p>
                {loading ? <p className="layer-hint">{t("loading")}</p> : null}

                {!loading && L.id === "morphology" ? (
                  hasMorph ? (
                    <div className="morph-facts--inline">
                      {enrichment?.root ? (
                        <Link
                          href={`/root/${encodeURIComponent(enrichment.root)}`}
                          className="morph-chip"
                        >
                          {t("morphRootChip", { root: enrichment.root })}
                        </Link>
                      ) : null}
                      {enrichment?.lemma ? (
                        <span className="morph-chip">
                          {t("morphLemmaChip", { lemma: enrichment.lemma })}
                        </span>
                      ) : null}
                      {enrichment?.particleLabelAr ? (
                        <span className="morph-chip">
                          {locale === "en"
                            ? enrichment.particleLabelEn
                            : enrichment.particleLabelAr}
                        </span>
                      ) : null}
                      {posLabels ? (
                        <span className="morph-chip">{posLabels}</span>
                      ) : null}
                      {featureLabels ? (
                        <span className="morph-chip">{featureLabels}</span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="layer-hint">{t("noMorph")}</p>
                  )
                ) : null}

                {!loading && L.id === "semantics" ? (
                  hasSense ? (
                    <p dir="rtl" lang="ar">
                      {enrichment?.sense}
                    </p>
                  ) : (
                    <p className="layer-hint">{th("semanticsAwaiting")}</p>
                  )
                ) : null}

                {!loading && L.id === "lexicon" ? (
                  hasLexicon ? (
                    <p dir="rtl" lang="ar" className="heritage-text">
                      {enrichment?.lexiconText}
                    </p>
                  ) : (
                    <p className="layer-hint">{t("noLexicon")}</p>
                  )
                ) : null}

                {!loading && L.id === "syntax" ? (
                  <p className="layer-hint">{th("syntaxAnalogyNote")}</p>
                ) : null}

                {!loading && L.id === "rhetoric" ? (
                  hasRhetoric ? (
                    <p dir={locale === "en" ? "ltr" : "rtl"} lang={locale}>
                      {locale === "en"
                        ? enrichment?.rhetoricEn
                        : enrichment?.rhetoricAr}
                    </p>
                  ) : (
                    <p className="layer-hint">{th("rhetoricAwaiting")}</p>
                  )
                ) : null}

                {!loading && L.id === "translation" ? (
                  hasTranslation ? (
                    <p dir={locale === "en" ? "ltr" : "rtl"} lang={locale}>
                      {translationText}
                    </p>
                  ) : (
                    <p className="layer-hint">{t("noWordTranslation")}</p>
                  )
                ) : null}

                {!loading && enrichment?.disclaimer ? (
                  <p className="layer-hint">{enrichment.disclaimer}</p>
                ) : null}
              </div>
            ) : null,
          )}
        </section>
      ) : null}
    </div>
  );
}
