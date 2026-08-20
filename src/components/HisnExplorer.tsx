"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { HisnCategory } from "@/lib/adhkar";

export function HisnExplorer({ categories }: { categories: HisnCategory[] }) {
  const t = useTranslations("Adhkar");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(categories[0]?.categoryAr ?? "");

  const filteredCats = useMemo(() => {
    const q = query.trim();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.categoryAr.includes(q) ||
        c.items.some((i) => i.textAr.includes(q)),
    );
  }, [categories, query]);

  const activeCat =
    filteredCats.find((c) => c.categoryAr === active) ?? filteredCats[0];

  const visibleItems = useMemo(() => {
    if (!activeCat) return [];
    const q = query.trim();
    if (!q) return activeCat.items;
    return activeCat.items.filter(
      (i) => i.textAr.includes(q) || activeCat.categoryAr.includes(q),
    );
  }, [activeCat, query]);

  return (
    <div className="hisn-explorer">
      <label className="adhkar-dua-search">
        <span>{t("hisnSearch")}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("hisnSearchPlaceholder")}
          dir="auto"
        />
      </label>

      <p className="adhkar-dua-count">
        {t("hisnStats", {
          categories: filteredCats.length,
          items: filteredCats.reduce((n, c) => n + c.items.length, 0),
        })}
      </p>

      <div className="hisn-layout">
        <nav className="hisn-cat-list" aria-label={t("hisnCategoriesAria")}>
          {filteredCats.map((c) => (
            <button
              key={c.categoryAr}
              type="button"
              className={`hisn-cat-btn${c.categoryAr === activeCat?.categoryAr ? " is-active" : ""}`}
              onClick={() => setActive(c.categoryAr)}
            >
              <span>{c.categoryAr}</span>
              <span className="hisn-cat-count">{c.items.length}</span>
            </button>
          ))}
        </nav>

        <section className="hisn-items" aria-live="polite">
          {activeCat ? (
            <>
              <h2>{activeCat.categoryAr}</h2>
              <ul className="adhkar-dua-list">
                {visibleItems.map((dua) => (
                  <li key={dua.id}>
                    <article className="adhkar-card">
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
                ))}
              </ul>
            </>
          ) : (
            <p className="empty-state">{t("hisnEmpty")}</p>
          )}
        </section>
      </div>
    </div>
  );
}
