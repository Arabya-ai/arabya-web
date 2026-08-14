"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { mushafAyahAudioUrl } from "@/lib/audio";
import { alignRecitation } from "@/lib/tahfeez/align";
import {
  extractSpeechSegments,
  freshWordResults,
  isAyahRecitationComplete,
} from "@/lib/tahfeez/session";
import {
  emptyTahfeezPortfolio,
  type TahfeezPortfolio,
  type TahfeezSessionSummary,
  type TahfeezWordResult,
  type TahfeezWordStatus,
} from "@/lib/tahfeez/types";

type VersePayload = {
  verseNumber: number;
  words: { text: string; position: number }[];
};

type ReciterOpt = { id: string; name: string; folder: string };

type TabId = "session" | "pages" | "stats" | "favorites" | "settings";

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult:
    | ((
        ev: {
          resultIndex?: number;
          results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
        },
      ) => void)
    | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function statusIcon(status: TahfeezWordStatus): string {
  if (status === "correct") return "✓";
  if (status === "wrong") return "✕";
  if (status === "skipped" || status === "hesitation") return "•";
  return "○";
}

function resetAyahAttemptState(
  expectedWords: string[],
  refs: {
    expectedRef: { current: string[] };
    resultsRef: { current: TahfeezWordResult[] };
    cursorRef: { current: number };
    hypoAllRef: { current: string };
    ayahCompletedRef: { current: boolean };
  },
  setters: {
    setWordResults: (v: TahfeezWordResult[]) => void;
    setCursor: (v: number) => void;
    setSessionAccuracy: (v: number) => void;
  },
): void {
  refs.expectedRef.current = expectedWords;
  const base = freshWordResults(expectedWords);
  refs.resultsRef.current = base;
  refs.cursorRef.current = 0;
  refs.hypoAllRef.current = "";
  refs.ayahCompletedRef.current = false;
  setters.setWordResults(base);
  setters.setCursor(0);
  setters.setSessionAccuracy(0);
}

export function TahfeezApp({
  locale,
  initialSurahId,
  initialSurahName,
  initialVerses,
  reciters,
}: {
  locale: string;
  initialSurahId: number;
  initialSurahName: string;
  initialVerses: VersePayload[];
  reciters: ReciterOpt[];
}) {
  const ar = locale !== "en";
  const [tab, setTab] = useState<TabId>("session");
  const [hideText, setHideText] = useState(false);
  const [reciterId, setReciterId] = useState(reciters[0]?.id || "abdulbasit");
  const [ayahIndex, setAyahIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [listeningHint, setListeningHint] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const [portfolio, setPortfolio] = useState<TahfeezPortfolio>(emptyTahfeezPortfolio());
  const [wordResults, setWordResults] = useState<TahfeezWordResult[]>([]);
  const [cursor, setCursor] = useState(0);
  const [sessionAccuracy, setSessionAccuracy] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const hypoAllRef = useRef("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRec | null>(null);
  const keepListeningRef = useRef(false);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const expectedRef = useRef<string[]>([]);
  const cursorRef = useRef(0);
  const resultsRef = useRef<TahfeezWordResult[]>([]);
  const ayahIndexRef = useRef(0);
  const verseNumberRef = useRef(1);
  const recordingRef = useRef(false);
  const advancingRef = useRef(false);
  const ayahCompletedRef = useRef(false);
  const elapsedRef = useRef(0);

  const verse = initialVerses[ayahIndex] || initialVerses[0];
  const expectedWords = useMemo(
    () => (verse?.words || []).map((w) => w.text),
    [verse],
  );

  useEffect(() => {
    ayahIndexRef.current = ayahIndex;
    verseNumberRef.current = verse?.verseNumber || 1;
  }, [ayahIndex, verse?.verseNumber]);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  useEffect(() => {
    resetAyahAttemptState(
      expectedWords,
      {
        expectedRef,
        resultsRef,
        cursorRef,
        hypoAllRef,
        ayahCompletedRef,
      },
      { setWordResults, setCursor, setSessionAccuracy },
    );
  }, [expectedWords]);

  useEffect(() => {
    void fetch("/api/tahfeez/portfolio")
      .then((r) => r.json())
      .then((data) => {
        if (data?.portfolio) setPortfolio(data.portfolio);
      })
      .catch(() => undefined);
  }, []);

  const playAyah = useCallback(() => {
    if (!verse) return;
    const url = mushafAyahAudioUrl(
      initialSurahId,
      verse.verseNumber,
      reciterId,
    );
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.pause();
    audio.src = url;
    audio.ontimeupdate = () => {
      if (!audio.duration) return;
      setAudioProgress(audio.currentTime / audio.duration);
    };
    audio.onended = () => setAudioProgress(1);
    void audio.play().catch(() => {
      setError(ar ? "تعذّر تشغيل الصوت" : "Could not play audio");
    });
  }, [ar, initialSurahId, reciterId, verse]);

  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const persistSession = useCallback(
    async (opts?: { verseNumber?: number; durationSec?: number }) => {
      const decided = resultsRef.current.filter((r) => r.status !== "pending");
      const correct = decided.filter((r) => r.status === "correct").length;
      const wrong = decided.filter((r) => r.status === "wrong").length;
      const skipped = decided.filter((r) => r.status === "skipped").length;
      const accuracy =
        decided.length === 0
          ? 0
          : Math.round((correct / decided.length) * 100);
      const ayahNum = opts?.verseNumber ?? verseNumberRef.current;
      const session: TahfeezSessionSummary = {
        id: `tf_${Date.now().toString(36)}_${ayahNum}`,
        surahId: initialSurahId,
        surahName: initialSurahName,
        ayahStart: ayahNum,
        ayahEnd: ayahNum,
        accuracy,
        correct,
        wrong,
        skipped,
        totalWords: expectedRef.current.length,
        durationSec: opts?.durationSec ?? elapsedRef.current,
        completedAt: new Date().toISOString(),
      };
      try {
        const res = await fetch("/api/tahfeez/portfolio", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session }),
        });
        const data = await res.json();
        if (data?.portfolio) setPortfolio(data.portfolio);
      } catch {
        /* ignore */
      }
    },
    [initialSurahId, initialSurahName],
  );

  const advanceToNextAyah = useCallback(() => {
    const idx = ayahIndexRef.current;
    if (idx >= initialVerses.length - 1) return false;

    const nextIdx = idx + 1;
    const nextWords = (initialVerses[nextIdx]?.words || []).map((w) => w.text);
    ayahIndexRef.current = nextIdx;
    verseNumberRef.current = initialVerses[nextIdx]?.verseNumber || nextIdx + 1;
    resetAyahAttemptState(
      nextWords,
      {
        expectedRef,
        resultsRef,
        cursorRef,
        hypoAllRef,
        ayahCompletedRef,
      },
      { setWordResults, setCursor, setSessionAccuracy },
    );
    setAyahIndex(nextIdx);
    setListeningHint(
      ar
        ? `الآية ${verseNumberRef.current} — استمر في التسميع`
        : `Ayah ${verseNumberRef.current} — keep reciting`,
    );
    return true;
  }, [ar, initialVerses]);

  const maybeCompleteAyah = useCallback(
    async (alignedCursor: number) => {
      const total = expectedRef.current.length;
      if (!isAyahRecitationComplete(alignedCursor, total)) return;
      if (ayahCompletedRef.current || advancingRef.current) return;
      if (!recordingRef.current) return;

      ayahCompletedRef.current = true;
      advancingRef.current = true;

      const completedVerse = verseNumberRef.current;
      await persistSession({ verseNumber: completedVerse });

      const hasNext = advanceToNextAyah();
      if (!hasNext) {
        setListeningHint(
          ar ? "اكتملت السورة — أحسنت!" : "Surah complete — well done!",
        );
        keepListeningRef.current = false;
        recognitionRef.current?.stop();
        recognitionRef.current = null;
        setRecording(false);
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }

      advancingRef.current = false;
    },
    [advanceToNextAyah, ar, persistSession],
  );

  const applyHypothesis = useCallback(
    async (hypothesisChunk: string) => {
      if (!hypothesisChunk.trim() || advancingRef.current) return;
      hypoAllRef.current = `${hypoAllRef.current} ${hypothesisChunk}`.trim();
      const hypothesis = hypoAllRef.current;
      const local = alignRecitation(expectedRef.current, hypothesis);
      setWordResults(local.results);
      resultsRef.current = local.results;
      setCursor(local.cursor);
      cursorRef.current = local.cursor;
      setSessionAccuracy(local.accuracy);

      void maybeCompleteAyah(local.cursor);

      try {
        const res = await fetch("/api/tahfeez/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedWords: expectedRef.current,
            hypothesis,
            cursor: 0,
          }),
        });
        const data = await res.json();
        if (data?.ok && Array.isArray(data.results) && !advancingRef.current) {
          setWordResults(data.results);
          resultsRef.current = data.results;
          setCursor(data.cursor);
          cursorRef.current = data.cursor;
          setSessionAccuracy(data.accuracy);
          void maybeCompleteAyah(data.cursor);
        }
      } catch {
        /* local result kept */
      }
    },
    [maybeCompleteAyah],
  );

  const stopRecording = useCallback(() => {
    keepListeningRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setRecording(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const finishSession = useCallback(async () => {
    stopRecording();
    stopAudio();
    if (resultsRef.current.some((r) => r.status !== "pending")) {
      await persistSession();
    }
  }, [persistSession, stopAudio, stopRecording]);

  const bindRecognitionHandlers = useCallback(
    (rec: SpeechRec) => {
      rec.onresult = (ev) => {
        const { finalText, displayHint } = extractSpeechSegments(
          ev.results,
          ev.resultIndex ?? 0,
        );
        if (displayHint) setListeningHint(displayHint);
        if (finalText) void applyHypothesis(finalText);
      };
      rec.onerror = (ev) => {
        if (ev.error === "not-allowed") {
          setError(ar ? "الميكروفون مرفوض" : "Microphone blocked");
          stopRecording();
        } else if (ev.error === "no-speech" || ev.error === "aborted") {
          /* benign while restarting */
        }
      };
      rec.onend = () => {
        if (!keepListeningRef.current) return;
        try {
          rec.start();
        } catch {
          stopRecording();
        }
      };
    },
    [applyHypothesis, ar, stopRecording],
  );

  const startRecording = useCallback(async () => {
    setError(null);
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError(
        ar
          ? "متصفحك لا يدعم التعرف على الصوت. استخدم Chrome أو Edge."
          : "Speech recognition is not supported. Use Chrome or Edge.",
      );
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(ar ? "يلزم السماح بالميكروفون" : "Microphone permission required");
      return;
    }

    stopAudio();
    resetAyahAttemptState(
      expectedRef.current,
      {
        expectedRef,
        resultsRef,
        cursorRef,
        hypoAllRef,
        ayahCompletedRef,
      },
      { setWordResults, setCursor, setSessionAccuracy },
    );

    const rec = new Ctor();
    rec.lang = "ar-SA";
    rec.continuous = true;
    rec.interimResults = true;
    keepListeningRef.current = true;
    startedAtRef.current = Date.now();
    setElapsed(0);
    timerRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 500);

    bindRecognitionHandlers(rec);
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
    setListeningHint(ar ? "جاري التسجيل…" : "Recording…");
  }, [ar, bindRecognitionHandlers, stopAudio]);

  const toggleMic = () => {
    if (recording) void finishSession();
    else void startRecording();
  };

  const stats = portfolio.stats;

  return (
    <div className="tahfeez-shell" dir={ar ? "rtl" : "ltr"}>
      <header className="tahfeez-top">
        <div className="tahfeez-brand">
          <strong>{ar ? "تطبيق التسميع الذكي" : "Smart Recitation"}</strong>
          <span>
            {ar
              ? "اقرأ، استمع، وأتقن القرآن — خدمة مجانية لمسجّلي عربية"
              : "Read, listen, and master — free for signed-in Arabya users"}
          </span>
        </div>
        <div className="tahfeez-tabs" role="tablist">
          {(
            [
              ["session", ar ? "الجلسة" : "Session"],
              ["pages", ar ? "الصفحات" : "Pages"],
              ["stats", ar ? "الإحصائيات" : "Stats"],
              ["favorites", ar ? "المفضلة" : "Favorites"],
              ["settings", ar ? "الإعدادات" : "Settings"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <Link className="tahfeez-action" href="/account">
          {ar ? "حسابي" : "My account"}
        </Link>
      </header>

      {error ? (
        <p className="tahfeez-card" style={{ color: "#fecaca", marginBottom: "0.75rem" }}>
          {error}
        </p>
      ) : null}

      {tab === "session" ? (
        <div className="tahfeez-grid">
          <aside className="tahfeez-card">
            <h3>{ar ? "القارئ" : "Reciter"}</h3>
            <div className="tahfeez-reciter">
              <div className="tahfeez-reciter-avatar" aria-hidden>
                ♪
              </div>
              <select
                className="tahfeez-select"
                value={reciterId}
                onChange={(e) => setReciterId(e.target.value)}
              >
                {reciters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <div className="tahfeez-transport">
                <button type="button" onClick={() => setAyahIndex((i) => Math.max(0, i - 1))}>
                  ‹
                </button>
                <button type="button" onClick={playAyah}>
                  ▶
                </button>
                <button type="button" onClick={stopAudio}>
                  ❚❚
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAyahIndex((i) => Math.min(initialVerses.length - 1, i + 1))
                  }
                >
                  ›
                </button>
              </div>
              <div className="tahfeez-progress" aria-hidden>
                <span style={{ width: `${Math.round(audioProgress * 100)}%` }} />
              </div>
            </div>

            <h3 style={{ marginTop: "1rem" }}>{ar ? "إحصائياتك" : "Your stats"}</h3>
            <div className="tahfeez-stat-grid">
              <div className="tahfeez-stat">
                <b>{stats.pagesCompleted}</b>
                <small>{ar ? "صفحات مكتملة" : "Pages done"}</small>
              </div>
              <div className="tahfeez-stat">
                <b>{stats.pagesInProgress}</b>
                <small>{ar ? "قيد التقدم" : "In progress"}</small>
              </div>
              <div className="tahfeez-stat">
                <b>{stats.totalSessions}</b>
                <small>{ar ? "جلسات" : "Sessions"}</small>
              </div>
              <div className="tahfeez-stat">
                <b>{stats.overallAccuracy}%</b>
                <small>{ar ? "دقة عامة" : "Overall"}</small>
              </div>
            </div>

            <h3 style={{ marginTop: "1rem" }}>{ar ? "مستوى الإتقان" : "Mastery"}</h3>
            <div
              className="tahfeez-ring"
              style={{ ["--p" as string]: stats.overallAccuracy }}
            >
              <strong>{stats.overallAccuracy}%</strong>
            </div>
            <p className="tahfeez-note">
              {ar
                ? `صحيح ${stats.totalCorrectWords} · خطأ ${stats.totalWrongWords}`
                : `Correct ${stats.totalCorrectWords} · Wrong ${stats.totalWrongWords}`}
            </p>
          </aside>

          <section className="tahfeez-card tahfeez-stage">
            <div className="tahfeez-stage-head">
              <div>
                <strong>{initialSurahName}</strong>
                <span className="tahfeez-note">
                  {" "}
                  · {ar ? "آية" : "Ayah"} {verse?.verseNumber || 1}
                </span>
              </div>
              <button
                type="button"
                className="tahfeez-action"
                onClick={() => setHideText((v) => !v)}
              >
                {hideText
                  ? ar
                    ? "إظهار النص"
                    : "Show text"
                  : ar
                    ? "وضع المصحف / إخفاء"
                    : "Hide text (Hifz)"}
              </button>
            </div>

            <div className="tahfeez-stage-frame">
              <div className="tahfeez-ayah" data-hidden={hideText ? "true" : "false"}>
                {wordResults.map((w) => (
                  <span
                    key={`${w.index}-${w.text}`}
                    className="tahfeez-word"
                    data-status={w.status}
                  >
                    {w.text}
                  </span>
                ))}
              </div>

              <div className="tahfeez-controls">
                <button
                  type="button"
                  className="tahfeez-action"
                  onClick={() => {
                    stopRecording();
                    resetAyahAttemptState(
                      expectedWords,
                      {
                        expectedRef,
                        resultsRef,
                        cursorRef,
                        hypoAllRef,
                        ayahCompletedRef,
                      },
                      { setWordResults, setCursor, setSessionAccuracy },
                    );
                    setListeningHint("");
                    setElapsed(0);
                  }}
                >
                  {ar ? "إعادة" : "Reset"}
                </button>
                <button
                  type="button"
                  className="tahfeez-mic"
                  data-on={recording ? "true" : "false"}
                  aria-pressed={recording}
                  onClick={toggleMic}
                  title={ar ? "بدأ التسجيل" : "Start recording"}
                >
                  ●
                </button>
                <button
                  type="button"
                  className="tahfeez-action"
                  onClick={() =>
                    setAyahIndex((i) => Math.min(initialVerses.length - 1, i + 1))
                  }
                >
                  {ar ? "الآية التالية" : "Next ayah"}
                </button>
              </div>
              <p className="tahfeez-note" style={{ textAlign: "center" }}>
                {recording
                  ? ar
                    ? `بدأ التسجيل · ${elapsed}ث · ${cursor}/${expectedWords.length}`
                    : `Recording · ${elapsed}s · ${cursor}/${expectedWords.length}`
                  : ar
                    ? "اضغط الميكروفون لبدء التسميع — ينتقل تلقائياً للآية التالية"
                    : "Tap the mic — auto-advances to the next ayah"}
              </p>
            </div>
          </section>

          <aside className="tahfeez-card">
            <h3>{ar ? "حالة التسجيل" : "Recording status"}</h3>
            <p className="tahfeez-note">{listeningHint || (ar ? "جاهز" : "Ready")}</p>
            {recording ? (
              <div className="tahfeez-wave" aria-hidden>
                {Array.from({ length: 16 }).map((_, i) => (
                  <span key={i} />
                ))}
              </div>
            ) : null}

            <div
              className="tahfeez-ring"
              style={{ ["--p" as string]: sessionAccuracy, marginTop: "0.75rem" }}
            >
              <strong>{sessionAccuracy}%</strong>
            </div>
            <p className="tahfeez-note" style={{ textAlign: "center" }}>
              {ar ? "دقة الجلسة" : "Session accuracy"} · {cursor}/{expectedWords.length}
            </p>

            <h3 style={{ marginTop: "0.85rem" }}>{ar ? "نتيجة الكلمات" : "Word results"}</h3>
            <ul className="tahfeez-word-list">
              {wordResults.map((w) => (
                <li key={w.index} data-status={w.status}>
                  <span>{w.text}</span>
                  <span aria-label={w.status}>{statusIcon(w.status)}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      ) : null}

      {tab === "stats" || tab === "pages" ? (
        <div className="tahfeez-card">
          <h3>{ar ? "تقدّمك في الحساب" : "Your progress"}</h3>
          <div className="tahfeez-stat-grid">
            <div className="tahfeez-stat">
              <b>{stats.pagesCompleted}</b>
              <small>{ar ? "إنجازات قوية" : "Strong clears"}</small>
            </div>
            <div className="tahfeez-stat">
              <b>{stats.overallAccuracy}%</b>
              <small>{ar ? "متوسط الدقة" : "Avg accuracy"}</small>
            </div>
          </div>
          <ul className="tahfeez-word-list" style={{ marginTop: "0.75rem" }}>
            {portfolio.sessions.slice(0, 20).map((s) => (
              <li key={s.id}>
                <span>
                  {s.surahName} · {s.ayahStart}
                  {s.ayahEnd !== s.ayahStart ? `–${s.ayahEnd}` : ""} · {s.accuracy}%
                </span>
                <span>{new Date(s.completedAt).toLocaleDateString(locale)}</span>
              </li>
            ))}
            {portfolio.sessions.length === 0 ? (
              <li>
                <span className="tahfeez-note">
                  {ar ? "لا جلسات بعد — ابدأ التسميع." : "No sessions yet."}
                </span>
              </li>
            ) : null}
          </ul>
          <p style={{ marginTop: "0.75rem" }}>
            <Link className="tahfeez-action" href="/account/tahfeez">
              {ar ? "تفاصيل التسميع في حسابي" : "Recitation details in my account"}
            </Link>
          </p>
        </div>
      ) : null}

      {tab === "favorites" ? (
        <div className="tahfeez-card">
          <p className="tahfeez-note">
            {ar
              ? "المفضلة مرتبطة بحسابك عبر صفحة المفضّلة العامة."
              : "Favorites live in your account favorites page."}
          </p>
          <Link className="tahfeez-action" href="/favorites">
            {ar ? "فتح المفضلة" : "Open favorites"}
          </Link>
        </div>
      ) : null}

      {tab === "settings" ? (
        <div className="tahfeez-card">
          <h3>{ar ? "إعدادات التسميع" : "Recitation settings"}</h3>
          <p className="tahfeez-note">
            {ar
              ? "التعرف على الصوت يعمل مجاناً عبر متصفحك (Chrome/Edge). لا مفاتيح مدفوعة. يُفضَّل بيئة هادئة ونطق واضح."
              : "Speech recognition runs free in your browser (Chrome/Edge). No paid API keys. Prefer a quiet room."}
          </p>
          <label className="tahfeez-note" style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="checkbox"
              checked={hideText}
              onChange={(e) => setHideText(e.target.checked)}
            />
            {ar ? "إخفاء النص افتراضياً (وضع الحفظ)" : "Hide text by default"}
          </label>
        </div>
      ) : null}
    </div>
  );
}
