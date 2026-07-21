"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { type Bookmark, readBookmarks } from "@/lib/bookmarks";
import { getMushafPageHref, toArabicNumerals } from "@/lib/format";
import {
  getSurahUthmaniChipName,
  getSurahUthmaniTitle,
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

export function SurahIndex({
  surahs,
  mushafFirstPage,
}: {
  surahs: SurahMeta[];
  mushafFirstPage: Record<string, number>;
}) {
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
    return surahs.filter(
      (s) =>
        s.nameArabic.includes(q) ||
        s.nameSimple.toLowerCase().includes(q.toLowerCase()) ||
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
    const t = window.setTimeout(async () => {
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
      window.clearTimeout(t);
    };
  }, [query, showAll]);

  const showSearchPanel =
    query.trim().length >= 2 &&
    (searching || ayahHits.length > 0 || Boolean(rootHit) || total > 0);

  const hasMore = !showAll && total > PREVIEW_LIMIT;

  return (
    <div className="index-simple">
      <div className="index-search-simple">
        <input
          type="search"
          placeholder="بحث باسم السورة، رقمها، نص آية، أو جذر صرفي…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="بحث في السور والآيات والجذور"
          maxLength={120}
        />
      </div>

      {bookmarks.length ? (
        <section className="bookmarks-section" aria-labelledby="bookmarks-h">
          <h2 id="bookmarks-h">المفضّلات</h2>
          <ul className="bookmarks-list">
            {bookmarks.slice(0, 12).map((b) => (
              <li key={b.key}>
                <Link
                  href={`${getMushafPageHref(b.page)}#s${b.surahId}-v-${b.verse}`}
                >
                  {getSurahUthmaniTitle(b.surahId)} —{" "}
                  {toArabicNumerals(b.verse)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showSearchPanel ? (
        <section className="ayah-search-section" aria-labelledby="ayah-search-h">
          <div className="search-results-head">
            <h2 id="ayah-search-h">نتائج البحث</h2>
            {total > 0 ? (
              <p className="search-results-count" aria-live="polite">
                {toArabicNumerals(ayahHits.length)}
                {total > ayahHits.length
                  ? ` من ${toArabicNumerals(total)}`
                  : null}{" "}
                نتيجة
              </p>
            ) : null}
          </div>
          {rootHit ? (
            <Link href={rootHit.href} className="root-search-hit">
              <span className="root-search-label">جذر صرفي</span>
              <strong className="root-search-root">{rootHit.root}</strong>
              <span className="root-search-meta">
                {toArabicNumerals(rootHit.count)} موضعاً في القرآن
              </span>
            </Link>
          ) : null}
          {searching && !ayahHits.length && !rootHit ? (
            <p className="empty-state">جارٍ البحث…</p>
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
                      {h.nameAr} {toArabicNumerals(h.verse)}
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
              جميع النتائج ({toArabicNumerals(total)})
            </button>
          ) : null}
          {showAll && total > PREVIEW_LIMIT ? (
            <button
              type="button"
              className="search-show-all search-show-all--muted"
              onClick={() => setShowAll(false)}
            >
              عرض أول {toArabicNumerals(PREVIEW_LIMIT)} فقط
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="surah-grid-section" aria-labelledby="all-surahs">
        <h2 id="all-surahs">جميع سور القرآن الكريم</h2>
        <div className="surah-grid">
          {filtered.map((s) => (
            <Link
              key={s.id}
              href={getMushafPageHref(mushafFirstPage[String(s.id)] ?? 1)}
              className="surah-chip"
              aria-label={`سورة ${s.nameArabic}، ${s.revelationLabel}، ${s.versesCount} آية، ${s.juzLabel}`}
            >
              <span className="chip-num">{toArabicNumerals(s.id)}</span>
              <span className="chip-name">{getSurahUthmaniChipName(s.id)}</span>
              <span className="chip-tip" role="tooltip">
                <strong>{getSurahUthmaniTitle(s.id)}</strong>
                <span>
                  {s.revelationLabel} · {toArabicNumerals(s.versesCount)} آية
                </span>
                <span>{s.juzLabel}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {filtered.length === 0 && ayahHits.length === 0 && !rootHit ? (
        <p className="empty-state">لا توجد نتائج مطابقة.</p>
      ) : null}
    </div>
  );
}
