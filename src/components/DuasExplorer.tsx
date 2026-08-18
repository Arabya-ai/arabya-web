"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { DuaItem } from "@/lib/adhkar";

export function DuasExplorer({ duas }: { duas: DuaItem[] }) {
  const t = useTranslations("Adhkar");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => {
    const map = new Map<string, { ar: string; en: string }>();
    for (const dua of duas) {
      if (!map.has(dua.categoryAr)) {
        map.set(dua.categoryAr, {
          ar: dua.categoryAr,
          en: dua.categoryEn || dua.categoryAr,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.ar.localeCompare(b.ar, "ar"));
  }, [duas]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return duas.filter((dua) => {
      if (category !== "all" && dua.categoryAr !== category) return false;
      if (!q) return true;
      const hay = `${dua.textAr} ${dua.categoryAr} ${dua.categoryEn} ${dua.source || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [category, duas, query]);

  return (
    <>
      <div className="adhkar-dua-filters">
        <label className="adhkar-dua-search">
          <span>{t("duaSearch")}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("duaSearchPlaceholder")}
            dir="auto"
          />
        </label>
        <label className="adhkar-dua-filter-cat">
          <span>{t("duaCategoryFilter")}</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">{t("duaCategoryAll")}</option>
            {categories.map((cat) => (
              <option key={cat.ar} value={cat.ar}>
                {locale === "en" ? cat.en : cat.ar}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="adhkar-dua-count">
        {t("duaResults", { count: filtered.length })}
      </p>

      {filtered.length === 0 ? (
        <p className="empty-state">{t("duasEmpty")}</p>
      ) : (
        <ul className="adhkar-dua-list">
          {filtered.map((dua) => {
            const catLabel =
              locale === "en" ? dua.categoryEn : dua.categoryAr;
            return (
              <li key={dua.id}>
                <article className="adhkar-card">
                  <p className="adhkar-dua-cat">{catLabel}</p>
                  <p className="adhkar-card-text" lang="ar" dir="rtl">
                    {dua.textAr}
                  </p>
                  {dua.source ? (
                    <p className="adhkar-card-source">
                      {t("sourceLabel", { source: dua.source })}
                    </p>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
