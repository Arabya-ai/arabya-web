"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { upsertStudyEntry } from "@/lib/study-archive";
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
  total?: number;
  brief?: string;
  note?: string;
  error?: string;
};

const PREVIEW_LIMIT = 10;

export function StudyAssistant() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<StudyHit[]>([]);
  const [total, setTotal] = useState(0);
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [kick, setKick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoRan = useRef(false);
  const reqId = useRef(0);
  const skipDelayRef = useRef(false);

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
    skipDelayRef.current = true;
    setQuery(incoming.trim());
    setKick((n) => n + 1);
    window.requestAnimationFrame(() => {
      document.getElementById("study-h")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      inputRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      reqId.current += 1;
      setHits([]);
      setTotal(0);
      setBrief(null);
      setError(null);
      setSearched(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const delay = skipDelayRef.current ? 0 : 180;
    skipDelayRef.current = false;
    const t = window.setTimeout(async () => {
      const id = ++reqId.current;
      setLoading(true);
      setError(null);
      setSearched(true);
      try {
        const params = new URLSearchParams({ q });
        if (showAll) params.set("all", "1");
        else params.set("limit", String(PREVIEW_LIMIT));
        const res = await fetch(`/api/study?${params}`);
        const data = (await res.json()) as StudyResponse;
        if (cancelled || id !== reqId.current) return;
        if (!res.ok) {
          setHits([]);
          setTotal(0);
          setBrief(null);
          setError(data.error || "تعذّر البحث");
          return;
        }
        setHits(data.hits ?? []);
        setTotal(data.total ?? data.hits?.length ?? 0);
        setBrief(data.brief ?? null);
        if ((data.hits?.length ?? 0) > 0) {
          const first = data.hits![0];
          upsertStudyEntry({
            kind: "quick",
            title: q,
            query: q,
            surahId: first.surahId,
            verse: first.verse,
            snippet: data.brief || first.text?.slice(0, 180),
            href: `${getMushafPageHref(first.page)}#s${first.surahId}-v-${first.verse}`,
          });
        }
      } catch {
        if (cancelled || id !== reqId.current) return;
        setHits([]);
        setTotal(0);
        setBrief(null);
        setError("تعذّر الاتصال بخدمة الدراسة");
      } finally {
        if (!cancelled && id === reqId.current) setLoading(false);
      }
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, showAll, kick]);

  const runStudy = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setError("أدخل حرفين على الأقل للبحث الدراسي");
      return;
    }
    setShowAll(false);
    skipDelayRef.current = true;
    setKick((n) => n + 1);
  };

  const studyActive = searched && query.trim().length >= 2;
  const hasMore = !showAll && total > PREVIEW_LIMIT;

  return (
    <section
      className={`study-assistant${studyActive ? " study-assistant--active" : ""}`}
      aria-labelledby="study-h"
    >
      <h2 id="study-h">دراسة سريعة</h2>
      <p className="study-assistant-lead">
        ابحث عن كلمة أو عبارة — نعرض شرحاً موجزاً من المعنى العربي والإعراب
        والتفسير الميسّر، ثم الآيات المرتبطة فوراً أثناء الكتابة.
      </p>
      <form className="study-assistant-form" onSubmit={runStudy}>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setShowAll(false);
            setQuery(e.target.value);
          }}
          placeholder="مثال: ابراهيم · الحمد · رحمة…"
          aria-label="استعلام الدراسة"
          maxLength={120}
        />
        <button type="submit" className="study-assistant-btn" disabled={loading}>
          {loading ? "…" : "ادرس"}
        </button>
      </form>

      {error ? <p className="study-assistant-error">{error}</p> : null}

      {studyActive && total > 0 ? (
        <p className="search-results-count" aria-live="polite">
          {toArabicNumerals(hits.length)}
          {total > hits.length ? ` من ${toArabicNumerals(total)}` : null} نتيجة
          دراسية
        </p>
      ) : null}

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

      {hasMore ? (
        <button
          type="button"
          className="search-show-all"
          onClick={() => setShowAll(true)}
          disabled={loading}
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
  );
}
