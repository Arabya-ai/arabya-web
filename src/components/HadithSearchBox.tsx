"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type Hit = {
  id: string;
  collection: string;
  number: number;
  arabic: string;
  titleAr: string;
  titleEn: string;
  href: string;
};

export function HadithSearchBox() {
  const t = useTranslations("Hadith");
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setHits([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/hadith/search?q=${encodeURIComponent(query)}&limit=12`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { hits?: Hit[]; total?: number };
        if (!cancelled) {
          setHits(data.hits ?? []);
          setTotal(data.total ?? 0);
        }
      } catch {
        if (!cancelled) {
          setHits([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [q]);

  return (
    <div className="hadith-search">
      <label className="hadith-search-label" htmlFor="hadith-q">
        {t("searchLabel")}
      </label>
      <input
        id="hadith-q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("searchPlaceholder")}
        maxLength={120}
        aria-label={t("searchLabel")}
      />
      {q.trim().length >= 2 ? (
        <div className="hadith-search-results" aria-live="polite">
          {loading ? <p className="layer-empty">{t("searching")}</p> : null}
          {!loading && total === 0 ? (
            <p className="layer-empty">{t("searchEmpty")}</p>
          ) : null}
          {!loading && hits.length ? (
            <ul className="hadith-hit-list">
              {hits.map((h) => (
                <li key={h.id}>
                  <Link href={h.href}>
                    <span className="hadith-hit-meta">
                      {locale === "en" ? h.titleEn : h.titleAr} · #{h.number}
                    </span>
                    <span className="hadith-hit-text" dir="rtl" lang="ar">
                      {h.arabic}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
