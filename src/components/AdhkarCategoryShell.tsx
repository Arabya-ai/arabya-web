"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AdhkarItem } from "@/lib/adhkar";
import {
  computeItemsProgress,
  resetCategoryCounts,
  setLastAdhkarCategory,
} from "@/lib/adhkar-progress";
import { formatCount } from "@/lib/format";
import { AdhkarCounterList } from "@/components/AdhkarCounterList";

export function AdhkarCategoryShell({
  slug,
  items,
}: {
  slug: string;
  items: AdhkarItem[];
}) {
  const t = useTranslations("Adhkar");
  const locale = useLocale();
  const [progress, setProgress] = useState(() => computeItemsProgress(items));

  useEffect(() => {
    setLastAdhkarCategory(slug);
  }, [slug]);

  useEffect(() => {
    function refresh() {
      setProgress(computeItemsProgress(items));
    }
    refresh();
    window.addEventListener("arabya-adhkar-updated", refresh);
    return () => window.removeEventListener("arabya-adhkar-updated", refresh);
  }, [items]);

  return (
    <>
      <div className="adhkar-category-progress" aria-live="polite">
        <p>
          {t("categoryProgress", {
            done: formatCount(progress.done, locale),
            total: formatCount(progress.total, locale),
            pct: formatCount(progress.percent, locale),
          })}
        </p>
        <div className="adhkar-card-bar" aria-hidden>
          <span style={{ width: `${progress.percent}%` }} />
        </div>
        <button
          type="button"
          className="nav-pill"
          onClick={() => {
            resetCategoryCounts(items.map((i) => i.id));
            setProgress(computeItemsProgress(items));
          }}
        >
          {t("resetAll")}
        </button>
      </div>
      <AdhkarCounterList items={items} categorySlug={slug} />
    </>
  );
}
