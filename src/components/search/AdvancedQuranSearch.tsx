"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getSurahDisplayName } from "@/lib/surah-names";
import { juzLabel } from "@/lib/juz";
import type { SurahMeta } from "@/lib/types";

type SearchHit = {
  key: string;
  surahId: number;
  verse: number;
  page: number;
  text: string;
  nameAr: string;
};

type RootHit = {
  root: string;
  count: number;
  href: string;
};

const PREVIEW_LIMIT = 20;

export function AdvancedQuranSearch({ surahs }: { surahs: SurahMeta[] }) {
  const t = useTranslations("AdvancedSearch");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [surahFilter, setSurahFilter] = useState<number | "">("");
  const [juzFilter, setJuzFilter] = useState<number | "">("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [rootHit, setRootHit] = useState<RootHit | null>(null);
  const [searching, setSearching] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setShowAll(false);
  }, [query, surahFilter, juzFilter]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setTotal(0);
      setRootHit(null);
      setSearching(false);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q });
        if (showAll) params.set("all", "1");
        else params.set("limit", String(PREVIEW_LIMIT));
        if (surahFilter !== "") params.set("surah", String(surahFilter));
        if (juzFilter !== "") params.set("juz", String(juzFilter));
        const res = await fetch(`/api/search?${params}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          hits: SearchHit[];
          total?: number;
          root: RootHit | null;
        };
        if (!cancelled) {
          setHits(data.hits ?? []);
          setTotal(data.total ?? data.hits?.length ?? 0);
          setRootHit(data.root ?? null);
        }
      } catch {
        if (!cancelled) {
          setHits([]);
          setTotal(0);
          setRootHit(null);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 160);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, showAll, surahFilter, juzFilter]);

  const hasMore = !showAll && total > PREVIEW_LIMIT;

  return (
    <div className="adv-search">
      <div className="adv-search__filters">
        <label className="adv-search__q">
          <span>{t("queryLabel")}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            aria-label={t("ariaLabel")}
            maxLength={120}
            dir="auto"
          />
        </label>
        <label>
          <span>{t("surahFilter")}</span>
          <select
            value={surahFilter === "" ? "" : String(surahFilter)}
            onChange={(e) => {
              const v = e.target.value;
              setSurahFilter(v ? Number(v) : "");
            }}
          >
            <option value="">{t("surahAll")}</option>
            {surahs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}. {getSurahDisplayName(s.id, locale === "en" ? "en" : "ar")}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("juzFilter")}</span>
          <select
            value={juzFilter === "" ? "" : String(juzFilter)}
            onChange={(e) => {
              const v = e.target.value;
              setJuzFilter(v ? Number(v) : "");
            }}
          >
            <option value="">{t("juzAll")}</option>
            {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
              <option key={j} value={j}>
                {juzLabel(j, locale === "en" ? "en" : "ar")}
              </option>
            ))}
          </select>
        </label>
      </div>

      {searching ? <p className="adv-search__status">{t("searching")}</p> : null}

      {rootHit ? (
        <p className="adv-search__root">
          <Link href={rootHit.href}>
            {t("rootLabel", { root: rootHit.root, count: rootHit.count })}
          </Link>
        </p>
      ) : null}

      {query.trim().length >= 2 && !searching && total === 0 ? (
        <p className="empty-state">{t("noResults")}</p>
      ) : null}

      {hits.length > 0 ? (
        <>
          <p className="adv-search__count">
            {t("resultsCount", { shown: hits.length, total })}
          </p>
          <ul className="adv-search__hits">
            {hits.map((hit) => (
              <li key={hit.key}>
                <Link
                  href={`/ayah/${hit.surahId}/${hit.verse}`}
                  className="adv-search__hit"
                >
                  <span className="adv-search__key">
                    {hit.nameAr} {hit.surahId}:{hit.verse}
                  </span>
                  <span className="adv-search__text" lang="ar" dir="rtl">
                    {hit.text}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {hasMore ? (
            <button
              type="button"
              className="nav-pill"
              onClick={() => setShowAll(true)}
            >
              {t("showAll", { total })}
            </button>
          ) : null}
          {showAll && total > PREVIEW_LIMIT ? (
            <button
              type="button"
              className="nav-pill"
              onClick={() => setShowAll(false)}
            >
              {t("showPreview", { limit: PREVIEW_LIMIT })}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
