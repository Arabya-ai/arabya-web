"use client";

import Link from "next/link";
import { useState } from "react";
import { getMushafPageHref, toArabicNumerals } from "@/lib/format";

type StudyHit = {
  key: string;
  surahId: number;
  verse: number;
  page: number;
  text: string;
  nameAr: string;
  context?: string;
  words?: {
    text: string;
    meaningAr?: string | null;
    meaning?: string;
    root?: string | null;
    lemma?: string | null;
    irab?: string | null;
  }[];
};

export function StudyAssistant() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<StudyHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const runStudy = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setError("أدخل كلمتين على الأقل للبحث الدراسي");
      return;
    }
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch(`/api/study?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { hits?: StudyHit[]; error?: string };
      if (!res.ok) {
        setHits([]);
        setError(data.error || "تعذّر البحث");
        return;
      }
      setHits(data.hits ?? []);
    } catch {
      setHits([]);
      setError("تعذّر الاتصال بخدمة الدراسة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="study-assistant" aria-labelledby="study-h">
      <h2 id="study-h">دراسة سريعة</h2>
      <p className="study-assistant-lead">
        ابحث في الآيات مع إعراب ومعاني الكلمات من البيانات المحلية — استرجاع
        دراسي سريع دون نموذج لغوي.
      </p>
      <form className="study-assistant-form" onSubmit={runStudy}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="مثال: الحمد · رحمة · صراط…"
          aria-label="استعلام الدراسة"
        />
        <button type="submit" className="study-assistant-btn" disabled={loading}>
          {loading ? "…" : "ادرس"}
        </button>
      </form>

      {error ? <p className="study-assistant-error">{error}</p> : null}

      {searched && !loading && !error && hits.length === 0 ? (
        <p className="empty-state">لا توجد نتائج مطابقة.</p>
      ) : null}

      {hits.length > 0 ? (
        <ul className="study-assistant-list">
          {hits.map((h) => (
            <li key={h.key}>
              <Link
                href={`${getMushafPageHref(h.page)}?v=${h.surahId}:${h.verse}#s${h.surahId}-v-${h.verse}`}
                className="study-hit"
              >
                <span className="study-hit-key">
                  {h.nameAr} {toArabicNumerals(h.verse)}
                </span>
                <span className="study-hit-text">{h.text}</span>
                {h.words?.slice(0, 4).some((w) => w.irab || w.meaningAr) ? (
                  <span className="study-hit-meta">
                    {h.words
                      .slice(0, 3)
                      .map((w) => w.meaningAr || w.lemma || w.text)
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
