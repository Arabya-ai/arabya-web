"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  computeCategoryProgress,
  getTasbeehState,
  type AdhkarCategorySnapshot,
} from "@/lib/adhkar-progress";
import { formatCount } from "@/lib/format";

export function AccountAdhkarPanel({
  locale,
  categories,
  syncReady,
}: {
  locale: string;
  categories: AdhkarCategorySnapshot[];
  syncReady: boolean;
}) {
  const t = useTranslations("Account");
  const uiLocale = useLocale();
  const [tasbeeh, setTasbeeh] = useState(getTasbeehState());

  useEffect(() => {
    function refresh() {
      setTasbeeh(getTasbeehState());
    }
    refresh();
    window.addEventListener("arabya-adhkar-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("arabya-adhkar-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const rows = categories.map((cat) => {
    const prog = computeCategoryProgress(cat.slug, cat.targetSum);
    return {
      ...cat,
      prog,
      title: locale === "en" ? cat.titleEn : cat.titleAr,
    };
  });

  const totalDone = rows.reduce((n, r) => n + r.prog.done, 0);
  const totalTargets = rows.reduce((n, r) => n + r.prog.total, 0);

  return (
    <section className="dash-card">
      <h2>{t("adhkarTitle")}</h2>
      <p>{t("adhkarLead")}</p>
      {!syncReady ? (
        <p className="dash-muted">{t("adhkarLocalOnly")}</p>
      ) : (
        <p className="dash-muted">{t("adhkarSyncHint")}</p>
      )}
      <p className="adhkar-progress-line">
        {t("adhkarSummary", {
          done: formatCount(totalDone, uiLocale),
          total: formatCount(totalTargets, uiLocale),
        })}
      </p>
      <ul className="adhkar-account-list">
        {rows.map((row) => (
          <li key={row.slug}>
            <Link href={`/adhkar/${row.slug}`} className="adhkar-mini-row">
              <span>{row.title}</span>
              <span>{formatCount(row.prog.percent, uiLocale)}%</span>
            </Link>
            <div className="adhkar-card-bar" aria-hidden>
              <span style={{ width: `${row.prog.percent}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <div className="adhkar-account-tools">
        <Link href="/adhkar/tasbeeh" className="nav-pill">
          {t("adhkarTasbeeh", { count: formatCount(tasbeeh.count, uiLocale) })}
        </Link>
        <Link href="/adhkar" className="nav-pill">
          {t("adhkarOpenHub")}
        </Link>
      </div>
    </section>
  );
}
