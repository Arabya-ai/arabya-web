"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { QualityCoverage, QualityQueueItem } from "@/lib/quality-scan";
import { apiGet } from "@/lib/api-client";
import { toArabicNumerals } from "@/lib/format";

function formatCount(value: number, locale: string): string {
  return locale === "ar" ? toArabicNumerals(value) : String(value);
}

function formatPct(value: number, locale: string): string {
  const n = Number.isFinite(value) ? value.toFixed(1) : "0.0";
  return locale === "ar" ? toArabicNumerals(n) : n;
}

export function QualityQueueClient({
  initialItems,
  autoScan = false,
}: {
  initialItems: QualityQueueItem[];
  autoScan?: boolean;
}) {
  const t = useTranslations("Studio");
  const locale = useLocale();
  const [items, setItems] = useState(initialItems);
  const [coverage, setCoverage] = useState<QualityCoverage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(initialItems.length > 0);

  const rescan = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiGet("/api/studio/quality-scan", {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        items?: QualityQueueItem[];
        coverage?: QualityCoverage;
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error || t("scanError"));
      setItems(data.items || []);
      setCoverage(data.coverage ?? null);
      setScanned(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setBusy(false);
    }
  }, [t]);

  useEffect(() => {
    if (autoScan) void rescan();
  }, [autoScan, rescan]);

  const highIrab =
    (coverage?.irabVerseAlignIssues ?? 0) +
    (coverage?.irabMissingWordIds ?? 0);

  return (
    <div className="dash-stack">
      <div className="dash-actions">
        <button
          type="button"
          className="auth-btn auth-btn--google"
          disabled={busy}
          onClick={() => void rescan()}
        >
          {busy ? t("rescanBusy") : scanned ? t("rescanAgain") : t("runScan")}
        </button>
        <span className="dash-muted" style={{ margin: 0 }}>
          {t("itemCount", { count: formatCount(items.length, locale) })}
        </span>
      </div>

      {coverage ? (
        <section className="dash-card quality-coverage" aria-label={t("coverageTitle")}>
          <h2>{t("coverageTitle")}</h2>
          <div className="quality-coverage-stats">
            <div className="quality-coverage-stat">
              <strong>{formatPct(coverage.meaningArPct, locale)}%</strong>
              <span>{t("coverageMeaning")}</span>
              <div
                className="quality-coverage-bar"
                role="progressbar"
                aria-valuenow={coverage.meaningArPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${Math.min(100, coverage.meaningArPct)}%` }} />
              </div>
              <p className="dash-muted">
                {t("coverageMeaningDetail", {
                  withMeaning: formatCount(coverage.wordsWithMeaningAr, locale),
                  total: formatCount(coverage.totalWords, locale),
                })}
              </p>
            </div>
            <div className="quality-coverage-stat">
              <strong>{formatCount(highIrab, locale)}</strong>
              <span>{t("coverageIrabIssues")}</span>
              <p className="dash-muted">
                {t("coverageIrabDetail", {
                  align: formatCount(coverage.irabVerseAlignIssues, locale),
                  missingIds: formatCount(coverage.irabMissingWordIds, locale),
                  surahs: formatCount(coverage.irabSurahsPresent, locale),
                })}
              </p>
            </div>
          </div>

          {coverage.worstMeaningSurahs.length ? (
            <div className="quality-worst">
              <h3>{t("worstSurahsTitle")}</h3>
              <ul className="quality-worst-list">
                {coverage.worstMeaningSurahs.map((s) => (
                  <li key={s.id}>
                    <Link href={`/surah/${s.id}/read`}>
                      {t("worstSurahRow", {
                        id: formatCount(s.id, locale),
                        pct: formatPct(s.pct, locale),
                        missing: formatCount(s.missing, locale),
                      })}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {error ? <p className="dash-banner dash-banner--warn">{error}</p> : null}
      {busy && !scanned ? (
        <section className="dash-card">
          <p className="dash-muted">{t("scanningLead")}</p>
        </section>
      ) : null}
      {!busy && scanned && items.length === 0 ? (
        <section className="dash-card">
          <h2>{t("noIssuesTitle")}</h2>
          <p className="dash-muted">{t("noIssuesLead")}</p>
        </section>
      ) : null}
      {items.map((item) => (
        <article key={item.id} className="dash-card">
          <p className="dash-kicker">{t("priority", { priority: item.priority })}</p>
          <h2>{item.title}</h2>
          <p className="dash-muted">{item.surahHint}</p>
          <p>{item.note}</p>
        </article>
      ))}
    </div>
  );
}
