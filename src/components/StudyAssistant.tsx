"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getMushafPageHref, toArabicNumerals } from "@/lib/format";
import { STUDY_QUERY_KEY } from "@/components/StudyVerseButton";

type StudyWord = {
  text: string;
  meaningAr?: string | null;
  lemma?: string | null;
  irab?: string | null;
  matched?: boolean;
};

type StudyHit = {
  key: string;
  surahId: number;
  verse: number;
  page: number;
  text: string;
  nameAr: string;
  explain?: string;
  tafsirSnippet?: string | null;
  matchedWords?: StudyWord[];
  words?: StudyWord[];
};

type StudyResponse = {
  hits?: StudyHit[];
  brief?: string;
  note?: string;
  error?: string;
};

export function StudyAssistant() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<StudyHit[]>([]);
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoRan = useRef(false);

  const runStudy = async (e?: React.FormEvent, override?: string) => {
    e?.preventDefault();
    const q = (override ?? query).trim();
    if (q.length < 2) {
      setError("أدخل حرفين على الأقل للبحث الدراسي");
      return;
    }
    setQuery(q);
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch(`/api/study?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as StudyResponse;
      if (!res.ok) {
        setHits([]);
        setBrief(null);
        setError(data.error || "تعذّر البحث");
        return;
      }
      setHits(data.hits ?? []);
      setBrief(data.brief ?? null);
    } catch {
      setHits([]);
      setBrief(null);
      setError("تعذّر الاتصال بخدمة الدراسة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoRan.current) return;
    let incoming: string | null = null;
    try {
      const params = new URLSearchParams(window.location.search);
      incoming = params.get("q") || params.get("study");
      if (!incoming) {
        incoming = sessionStorage.getItem(STUDY_QUERY_KEY);
        if (incoming) sessionStorage.removeItem(STUDY_QUERY_KEY);
      }
    } catch {
      incoming = null;
    }
    if (!incoming || incoming.trim().length < 2) return;
    autoRan.current = true;
    setQuery(incoming.trim());
    void runStudy(undefined, incoming.trim());
    window.requestAnimationFrame(() => {
      document.getElementById("study-h")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      inputRef.current?.focus();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot hydrate from study link
  }, []);

  return (
    <section className="study-assistant" aria-labelledby="study-h">
      <h2 id="study-h">دراسة سريعة</h2>
      <p className="study-assistant-lead">
        ابحث عن كلمة أو عبارة — نعرض شرحاً موجزاً من المعنى العربي والإعراب
        والتفسير الميسّر، ثم الآيات المرتبطة.
      </p>
      <form className="study-assistant-form" onSubmit={runStudy}>
        <input
          ref={inputRef}
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

      {brief && !error ? (
        <div className="study-brief" role="status">
          <h3>ملخص دراسي</h3>
          <p>{brief}</p>
        </div>
      ) : null}

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
                {h.explain ? (
                  <span className="study-hit-explain">{h.explain}</span>
                ) : null}
                {h.matchedWords?.length ? (
                  <span className="study-hit-meta">
                    {h.matchedWords
                      .slice(0, 3)
                      .map((w) => w.irab || w.meaningAr || w.lemma || w.text)
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                ) : h.words?.slice(0, 4).some((w) => w.irab || w.meaningAr) ? (
                  <span className="study-hit-meta">
                    {h.words
                      .slice(0, 3)
                      .map((w) => w.meaningAr || w.lemma || w.text)
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                ) : null}
              </Link>
              <p className="study-hit-links">
                <Link href={`/ayah/${h.surahId}/${h.verse}`}>إعراب الآية</Link>
                {" · "}
                <Link href={`/surah/${h.surahId}/read#v-${h.verse}`}>
                  دراسة السورة
                </Link>
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
