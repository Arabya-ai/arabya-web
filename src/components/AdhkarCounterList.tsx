"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AdhkarItem } from "@/lib/adhkar";
import {
  getAdhkarCount,
  incrementAdhkarCount,
  resetAdhkarCount,
} from "@/lib/adhkar-progress";
import { formatCount } from "@/lib/format";

function CounterCard({ item }: { item: AdhkarItem }) {
  const t = useTranslations("Adhkar");
  const locale = useLocale();
  const target = Math.max(1, item.repeat || 1);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    setCurrent(getAdhkarCount(item.id));
  }, [item.id]);

  const done = current >= target;
  const pct = Math.min(100, Math.round((current / target) * 100));
  const fadl =
    locale === "en"
      ? item.fadlEn || item.fadlAr
      : item.fadlAr || item.fadlEn;

  return (
    <article className={`adhkar-card${done ? " is-done" : ""}`}>
      <p className="adhkar-card-text" lang="ar" dir="rtl">
        {item.textAr}
      </p>
      {fadl ? (
        <p className="adhkar-card-fadl">
          <strong>{t("fadlLabel")}:</strong> {fadl}
        </p>
      ) : null}
      {item.source ? (
        <p className="adhkar-card-source">
          {t("sourceLabel", { source: item.source })}
        </p>
      ) : null}
      <p className="adhkar-card-progress">
        {t("progressLabel", {
          current: formatCount(current, locale),
          target: formatCount(target, locale),
        })}
      </p>
      <div className="adhkar-card-bar" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="adhkar-card-actions">
        <button
          type="button"
          className="adhkar-tap-btn"
          onClick={() => setCurrent(incrementAdhkarCount(item.id, target))}
          disabled={done}
        >
          {done ? t("done") : t("tap")}
        </button>
        <button
          type="button"
          className="nav-pill"
          onClick={() => setCurrent(resetAdhkarCount(item.id))}
        >
          {t("reset")}
        </button>
      </div>
    </article>
  );
}

export function AdhkarCounterList({ items }: { items: AdhkarItem[] }) {
  return (
    <div className="adhkar-list">
      {items.map((item) => (
        <CounterCard key={item.id} item={item} />
      ))}
    </div>
  );
}
