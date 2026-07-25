"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { type Bookmark, readBookmarks } from "@/lib/bookmarks";
import { getMushafPageHref, toArabicNumerals } from "@/lib/format";
import {
  getSurahDisplayName,
  getSurahDisplayTitle,
  getSurahEnglishName,
  getSurahUthmaniChipName,
} from "@/lib/surah-names";
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

const PREVIEW_LIMIT = 10;

function formatCount(
  value: number,
  locale: string,
): string {
  return locale === "ar" ? toArabicNumerals(value) : String(value);
}

export function SurahIndex({
  surahs,
  mushafFirstPage,
}: {
  surahs: SurahMeta[];
  mushafFirstPage: Record<string, number>;
}) {
  const t = useTranslations("Search");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [ayahHits, setAyahHits] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [rootHit, setRootHit] = useState<RootHit | null>(null);
  const [searching, setSearching] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    setBookmarks(readBookmarks());
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return surahs;
    const qLower = q.toLowerCase();
    return surahs.filter(
      (s) =>
        s.nameArabic.includes(q) ||
        s.nameSimple.toLowerCase().includes(qLower) ||
        getSurahEnglishName(s.id).toLowerCase().includes(qLower) ||
        getSurahUthmaniChipName(s.id).includes(q) ||
        String(s.id) === q,
    );
  }, [surahs, query]);

  useEffect(() => {
    setShowAll(false);
  }, [query]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setAyahHits([]);
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
        const res = await fetch(`/api/search?${params}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          hits: SearchHit[];
          total?: number;
          root: RootHit | null;
        };
        if (!cancelled) {
          setAyahHits(data.hits ?? []);
          setTotal(data.total ?? data.hits?.length ?? 0);
          setRootHit(data.root ?? null);
        }
      } catch {
        if (!cancelled) {
          setAyahHits([]);
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
  }, [query, showAll]);

  const showSearchPanel =
    query.trim().length >= 2 &&
    (searching || ayahHits.length > 0 || Boolean(rootHit) || total > 0);

  const hasMore = !showAll && total > PREVIEW_LIMIT;

  const revelationLabel = (s: SurahMeta) =>
    t(`revelation.${s.revelationPlace}`);

  const juzLabel = (s: SurahMeta) =>
    locale === "ar" ? s.juzLabel : t("juz", { n: s.juz });

  return (
    <div className="index-simple">
      <div className="index-search-simple">
        <input
          type="search"
          placeholder={t("placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("ariaLabel")}
          maxLength={120}
        />
      </div>

      {bookmarks.length ? (
        <section className="bookmarks-section" aria-labelledby="bookmarks-h">
          <h2 id="bookmarks-h">{t("bookmarks")}</h2>
          <ul className="bookmarks-list">
            {bookmarks.slice(0, 12).map((b) => (
              <li key={b.key}>
                <Link
                  href={`${getMushafPageHref(b.page)}#s${b.surahId}-v-${b.verse}`}
                >
                  {getSurahDisplayTitle(b.surahId, locale)} —{" "}
                  {formatCount(b.verse, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showSearchPanel ? (
        <section className="ayah-search-section" aria-labelledby="ayah-search-h">
          <div className="search-results-head">
            <h2 id="ayah-search-h">{t("resultsTitle")}</h2>
            {total > 0 ? (
              <p className="search-results-count" aria-live="polite">
                {total > ayahHits.length
                  ? t("resultsCount", {
                      shown: formatCount(ayahHits.length, locale),
                      total: formatCount(total, locale),
                    })
                  : t("resultsCountOnly", {
                      count: formatCount(ayahHits.length, locale),
                    })}
              </p>
            ) : null}
          </div>
          {rootHit ? (
            <Link href={rootHit.href} className="root-search-hit">
              <span className="root-search-label">{t("rootLabel")}</span>
              <strong className="root-search-root">{rootHit.root}</strong>
              <span className="root-search-meta">
                {t("rootMeta", {
                  count: formatCount(rootHit.count, locale),
                })}
              </span>
            </Link>
          ) : null}
          {searching && !ayahHits.length && !rootHit ? (
            <p className="empty-state">{t("searching")}</p>
          ) : null}
          {ayahHits.length ? (
            <ul className="ayah-search-list">
              {ayahHits.map((h) => (
                <li key={h.key}>
                  <Link
                    href={`${getMushafPageHref(h.page)}#s${h.surahId}-v-${h.verse}`}
                    className="ayah-search-hit"
                  >
                    <span className="ayah-search-key">
                      {h.nameAr} {formatCount(h.verse, locale)}
                    </span>
                    <span className="ayah-search-text">{h.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {hasMore ? (
            <button
              type="button"
              className="search-show-all"
              onClick={() => setShowAll(true)}
              disabled={searching}
            >
              {t("showAll", { total: formatCount(total, locale) })}
            </button>
          ) : null}
          {showAll && total > PREVIEW_LIMIT ? (
            <button
              type="button"
              className="search-show-all search-show-all--muted"
              onClick={() => setShowAll(false)}
            >
              {t("showPreview", {
                limit: formatCount(PREVIEW_LIMIT, locale),
              })}
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="surah-grid-section" aria-labelledby="all-surahs">
        <h2 id="all-surahs">{t("allSurahs")}</h2>
        <div className="surah-grid">
          {filtered.map((s) => (
            <Link
              key={s.id}
              href={getMushafPageHref(mushafFirstPage[String(s.id)] ?? 1)}
              className="surah-chip"
              aria-label={t("surahAria", {
                name: getSurahDisplayTitle(s.id, locale),
                revelation: revelationLabel(s),
                verses: formatCount(s.versesCount, locale),
                juz: juzLabel(s),
              })}
            >
              <span className="chip-num">{formatCount(s.id, locale)}</span>
              <span className="chip-name">{getSurahDisplayName(s.id, locale)}</span>
              <span className="chip-tip" role="tooltip">
                <strong>{getSurahDisplayTitle(s.id, locale)}</strong>
                <span>
                  {revelationLabel(s)} ·{" "}
                  {t("verseCount", {
                    count: formatCount(s.versesCount, locale),
                  })}
                </span>
                <span>{juzLabel(s)}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {filtered.length === 0 && ayahHits.length === 0 && !rootHit ? (
        <p className="empty-state">{t("noResults")}</p>
      ) : null}
    </div>
  );
}
