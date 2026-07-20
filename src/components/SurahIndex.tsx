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

export function SurahIndex({
  surahs,
  mushafFirstPage,
}: {
  surahs: SurahMeta[];
  mushafFirstPage: Record<string, number>;
}) {
  const [query, setQuery] = useState("");
  const [ayahHits, setAyahHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
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
    const q = query.trim();
    if (q.length < 2) {
      setAyahHits([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { hits: SearchHit[] };
        if (!cancelled) setAyahHits(data.hits ?? []);
      } catch {
        if (!cancelled) setAyahHits([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query]);

  return (
    <div className="index-simple">
      <div className="index-search-simple">
        <input
          type="search"
          placeholder="بحث باسم السورة، رقمها، أو نص آية…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="بحث في السور والآيات"
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

      {query.trim().length >= 2 && (searching || ayahHits.length > 0) ? (
        <section className="ayah-search-section" aria-labelledby="ayah-search-h">
          <h2 id="ayah-search-h">نتائج الآيات</h2>
          {searching && !ayahHits.length ? (
            <p className="empty-state">جارٍ البحث…</p>
          ) : (
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
          )}
        </section>
      ) : null}

      <section className="surah-grid-section" aria-labelledby="all-surahs">
        <h2 id="all-surahs">جميع سور القرآن الكريم</h2>
        <div className="surah-grid">
          {filtered.map((s) => (
            <Link
              key={s.id}
              href={`/surah/${s.id}/read`}
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

      {filtered.length === 0 && ayahHits.length === 0 ? (
        <p className="empty-state">لا توجد نتائج مطابقة.</p>
      ) : null}
    </div>
  );
}
