"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatCount } from "@/lib/format";
import {
  computeCategoryProgress,
  getAdhkarProgressSummary,
  type AdhkarCategorySnapshot,
} from "@/lib/adhkar-progress";

type Props = {
  locale: string;
  categories: AdhkarCategorySnapshot[];
};

export function AdhkarHubClient({ locale, categories }: Props) {
  const t = useTranslations("Adhkar");
  const [summary, setSummary] = useState(() =>
    getAdhkarProgressSummary(categories),
  );

  useEffect(() => {
    function refresh() {
      setSummary(getAdhkarProgressSummary(categories));
    }
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("arabya-adhkar-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("arabya-adhkar-updated", refresh);
    };
  }, [categories]);

  const continueCat = useMemo(() => {
    if (!summary.lastSlug) return null;
    return categories.find((c) => c.slug === summary.lastSlug) ?? null;
  }, [categories, summary.lastSlug]);

  const continueProgress = continueCat
    ? computeCategoryProgress(continueCat.slug, continueCat.targetSum)
    : null;

  if (summary.totalTargets === 0) return null;

  const pct = Math.round((summary.totalDone / summary.totalTargets) * 100);

  return (
    <section className="adhkar-progress-hub" aria-labelledby="adhkar-progress-title">
      <h2 id="adhkar-progress-title">{t("progressHeading")}</h2>
      <p className="adhkar-progress-line">
        {t("progressSummary", {
          done: formatCount(summary.totalDone, locale),
          total: formatCount(summary.totalTargets, locale),
          pct: formatCount(pct, locale),
        })}
      </p>
      <div className="adhkar-card-bar adhkar-progress-hub-bar" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </div>

      {continueCat && continueProgress && continueProgress.percent < 100 ? (
        <Link
          href={`/adhkar/${continueCat.slug}`}
          className="adhkar-continue-link"
        >
          {t("continueCategory", {
            title:
              locale === "en" ? continueCat.titleEn : continueCat.titleAr,
            pct: formatCount(continueProgress.percent, locale),
          })}
        </Link>
      ) : null}

      <ul className="adhkar-mini-progress">
        {categories.map((cat) => {
          const prog = computeCategoryProgress(cat.slug, cat.targetSum);
          const title = locale === "en" ? cat.titleEn : cat.titleAr;
          return (
            <li key={cat.slug}>
              <Link href={`/adhkar/${cat.slug}`} className="adhkar-mini-row">
                <span>{title}</span>
                <span>{formatCount(prog.percent, locale)}%</span>
              </Link>
              <div className="adhkar-card-bar" aria-hidden>
                <span style={{ width: `${prog.percent}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
