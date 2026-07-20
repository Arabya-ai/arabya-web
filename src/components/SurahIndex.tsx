"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SurahMeta } from "@/lib/types";
import { toArabicNumerals, getMushafPageHref } from "@/lib/format";
import { getSurahUthmaniChipName, getSurahUthmaniTitle } from "@/lib/surah-names";

export function SurahIndex({
  surahs,
  mushafFirstPage,
}: {
  surahs: SurahMeta[];
  mushafFirstPage: Record<string, number>;
}) {
  const [query, setQuery] = useState("");

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

  return (
    <div className="index-simple">
      <div className="index-search-simple">
        <input
          type="search"
          placeholder="بحث سريع باسم السورة أو رقمها…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="بحث عن سورة"
        />
      </div>

      <section className="surah-grid-section" aria-labelledby="all-surahs">
        <h2 id="all-surahs">جميع سور القرآن الكريم</h2>
        <div className="surah-grid">
          {filtered.map((s) => (
            <Link
              key={s.id}
              href={getMushafPageHref(mushafFirstPage[String(s.id)] ?? s.id)}
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

      {filtered.length === 0 ? (
        <p className="empty-state">لا توجد نتائج مطابقة.</p>
      ) : null}
    </div>
  );
}
