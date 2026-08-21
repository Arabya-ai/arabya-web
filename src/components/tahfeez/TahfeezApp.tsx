"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { mushafAyahAudioUrl } from "@/lib/audio";
import { alignRecitation } from "@/lib/tahfeez/align";
import { normalizeArabicToken } from "@/lib/tahfeez/normalize";
import {
  TAHFEEZ_MAX_AYAHS,
  tahfeezHref,
  type TahfeezSurahOption,
  type TahfeezVersePayload,
} from "@/lib/tahfeez/paths";
import {
  extractSpeechSegments,
  freshWordResults,
  isAyahRecitationComplete,
  isStaleAlignGeneration,
} from "@/lib/tahfeez/session";
import {
  emptyTahfeezPortfolio,
  type TahfeezPortfolio,
  type TahfeezSessionSummary,
  type TahfeezWordResult,
  type TahfeezWordStatus,
} from "@/lib/tahfeez/types";

type ReciterOpt = { id: string; name: string; folder: string };

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

function statusLabel(status: TahfeezWordStatus, ar: boolean): string {
  if (status === "correct") return ar ? "صواب" : "Correct";
  if (status === "wrong") return ar ? "خطأ" : "Wrong";
  if (status === "skipped") return ar ? "تخطي" : "Skipped";
  if (status === "hesitation") return ar ? "تردّد" : "Hesitation";
  return ar ? "بانتظار" : "Pending";
}

function resetAyahAttemptState(
  expectedWords: string[],
  refs: {
    expectedRef: { current: string[] };
    resultsRef: { current: TahfeezWordResult[] };
    cursorRef: { current: number };
    hypoAllRef: { current: string };
    ayahCompletedRef: { current: boolean };
    alignGenRef: { current: number };
  },
  setters: {
    setWordResults: (v: TahfeezWordResult[]) => void;
    setCursor: (v: number) => void;
    setSessionAccuracy: (v: number) => void;
  },
): number {
  refs.alignGenRef.current += 1;
  refs.expectedRef.current = expectedWords;
  const base = freshWordResults(expectedWords);
  refs.resultsRef.current = base;
  refs.cursorRef.current = 0;
  refs.hypoAllRef.current = "";
  refs.ayahCompletedRef.current = false;
  setters.setWordResults(base);
  setters.setCursor(0);
  setters.setSessionAccuracy(0);
  return refs.alignGenRef.current;
}

export function TahfeezApp({
  locale,
  initialSurahId,
  initialSurahName,
  initialAyahFrom,
  initialAyahTo,
  initialAyahCount,
  initialVerses,
  surahCatalog,
  reciters,
}: {
  locale: string;
  initialSurahId: number;
  initialSurahName: string;
  initialAyahFrom: number;
  initialAyahTo: number;
  initialAyahCount: number;
  initialVerses: TahfeezVersePayload[];
  surahCatalog: TahfeezSurahOption[];
  reciters: ReciterOpt[];
}) {
  const ar = locale !== "en";
  const router = useRouter();
  const [hideText, setHideText] = useState(false);
  const [reciterId, setReciterId] = useState(reciters[0]?.id || "abdulbasit");
  const [ayahIndex, setAyahIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [listeningHint, setListeningHint] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const [portfolio, setPortfolio] = useState<TahfeezPortfolio>(
    emptyTahfeezPortfolio(),
  );
  const [wordResults, setWordResults] = useState<TahfeezWordResult[]>([]);
  const [cursor, setCursor] = useState(0);
  const [sessionAccuracy, setSessionAccuracy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [draftFrom, setDraftFrom] = useState(String(initialAyahFrom));
  const [draftTo, setDraftTo] = useState(String(initialAyahTo));

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
  const alignGenRef = useRef(0);
  const elapsedRef = useRef(0);
  const skipExpectedWordsEffectRef = useRef(false);

  const verse = initialVerses[ayahIndex] || initialVerses[0];
  const expectedWords = useMemo(
    () => (verse?.words || []).map((w) => w.text),
    [verse],
  );

  useEffect(() => {
    setDraftFrom(String(initialAyahFrom));
    setDraftTo(String(initialAyahTo));
    setAyahIndex(0);
  }, [initialSurahId, initialAyahFrom, initialAyahTo]);

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
    if (skipExpectedWordsEffectRef.current) {
      skipExpectedWordsEffectRef.current = false;
      return;
    }
    resetAyahAttemptState(
      expectedWords,
      {
        expectedRef,
        resultsRef,
        cursorRef,
        hypoAllRef,
        ayahCompletedRef,
        alignGenRef,
      },
      { setWordResults, setCursor, setSessionAccuracy },
    );

    // Local/dev visual QA: ?demo=align paints sample correct/wrong without mic.
    if (
      process.env.NODE_ENV === "development" &&
      typeof window !== "undefined"
    ) {
      const demo = new URLSearchParams(window.location.search).get("demo");
      if (demo === "align" && expectedWords.length > 0) {
        const sample = expectedWords
          .slice(0, Math.min(4, expectedWords.length))
          .map((w, i) => (i === 1 ? "كلمةخاطئة" : w))
          .join(" ");
        const local = alignRecitation(expectedWords, sample);
        setWordResults(local.results);
        resultsRef.current = local.results;
        setCursor(local.cursor);
        cursorRef.current = local.cursor;
        setSessionAccuracy(local.accuracy);
        setListeningHint(
          ar
            ? "وضع تجريبي محلي: عرض تلوين الصواب/الخطأ"
            : "Local demo: sample correct/wrong coloring",
        );
      }
    }
  }, [expectedWords, ar]);

  useEffect(() => {
    void fetch("/api/tahfeez/portfolio")
      .then((r) => r.json())
      .then((data) => {
        if (data?.portfolio) setPortfolio(data.portfolio);
      })
      .catch(() => undefined);
  }, []);

  const navigateSession = useCallback(
    (surah: number, from: number, to: number) => {
      router.push(tahfeezHref({ surah, from, to }));
    },
    [router],
  );

  const applyRange = useCallback(() => {
    const meta = surahCatalog.find((s) => s.id === initialSurahId);
    const max = meta?.versesCount || initialAyahCount;
    const from = Math.max(1, Math.min(max, Number(draftFrom) || 1));
    let to = Math.max(from, Math.min(max, Number(draftTo) || from));
    if (to - from + 1 > TAHFEEZ_MAX_AYAHS) {
      to = from + TAHFEEZ_MAX_AYAHS - 1;
    }
    navigateSession(initialSurahId, from, to);
  }, [
    draftFrom,
    draftTo,
    initialAyahCount,
    initialSurahId,
    navigateSession,
    surahCatalog,
  ]);

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

  const goToAyahIndex = useCallback(
    (nextIdx: number) => {
      const clamped = Math.max(0, Math.min(initialVerses.length - 1, nextIdx));
      if (clamped === ayahIndexRef.current) return clamped;

      const nextWords = (initialVerses[clamped]?.words || []).map((w) => w.text);
      ayahIndexRef.current = clamped;
      verseNumberRef.current =
        initialVerses[clamped]?.verseNumber || clamped + 1;
      skipExpectedWordsEffectRef.current = true;
      resetAyahAttemptState(
        nextWords,
        {
          expectedRef,
          resultsRef,
          cursorRef,
          hypoAllRef,
          ayahCompletedRef,
          alignGenRef,
        },
        { setWordResults, setCursor, setSessionAccuracy },
      );
      setAyahIndex(clamped);
      return clamped;
    },
    [initialVerses],
  );

  const advanceToNextAyah = useCallback(() => {
    const idx = ayahIndexRef.current;
    if (idx >= initialVerses.length - 1) return false;
    goToAyahIndex(idx + 1);
    setListeningHint(
      ar
        ? `الآية ${verseNumberRef.current} — استمر في التسميع`
        : `Ayah ${verseNumberRef.current} — keep reciting`,
    );
    return true;
  }, [ar, goToAyahIndex, initialVerses.length]);

  const stopRecording = useCallback(() => {
    keepListeningRef.current = false;
    const rec = recognitionRef.current;
    if (rec) rec.onend = null;
    rec?.stop();
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

  const applyHypothesisRef = useRef<
    (chunk: string, opts?: { permanent?: boolean }) => void
  >(() => {});
  const restartRecognitionRef = useRef<(() => void) | null>(null);

  const maybeCompleteAyah = useCallback(
    (alignedCursor: number) => {
      const totalActive = expectedRef.current.filter((w) =>
        Boolean(normalizeArabicToken(w)),
      ).length;
      if (!isAyahRecitationComplete(alignedCursor, totalActive)) return;
      if (ayahCompletedRef.current || advancingRef.current) return;
      if (!recordingRef.current) return;

      ayahCompletedRef.current = true;
      advancingRef.current = true;

      const completedVerse = verseNumberRef.current;
      void persistSession({ verseNumber: completedVerse });

      const hasNext = advanceToNextAyah();
      if (hasNext) {
        restartRecognitionRef.current?.();
      } else {
        setListeningHint(
          ar
            ? "انتهى نطاق الآيات — أحسنت! اختر نطاقًا تاليًا إن رغبت."
            : "Range complete — well done! Load the next range if you want.",
        );
        stopRecording();
      }

      advancingRef.current = false;
    },
    [advanceToNextAyah, ar, persistSession, stopRecording],
  );

  const applyHypothesis = useCallback(
    async (hypothesisChunk: string, opts?: { permanent?: boolean }) => {
      if (
        !hypothesisChunk.trim() ||
        advancingRef.current ||
        ayahCompletedRef.current
      ) {
        return;
      }

      const permanent = opts?.permanent !== false;
      const gen = alignGenRef.current;
      const hypothesis = permanent
        ? `${hypoAllRef.current} ${hypothesisChunk}`.trim()
        : `${hypoAllRef.current} ${hypothesisChunk}`.trim();
      if (permanent) {
        hypoAllRef.current = hypothesis;
      }
      const expected = expectedRef.current;

      const local = alignRecitation(expected, hypothesis);
      if (isStaleAlignGeneration(gen, alignGenRef.current)) return;

      setWordResults(local.results);
      resultsRef.current = local.results;
      setCursor(local.cursor);
      cursorRef.current = local.cursor;
      setSessionAccuracy(local.accuracy);

      if (!permanent) return;

      maybeCompleteAyah(local.cursor);
      if (isStaleAlignGeneration(gen, alignGenRef.current)) return;

      try {
        const res = await fetch("/api/tahfeez/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedWords: expected,
            hypothesis,
            cursor: 0,
          }),
        });
        const data = await res.json();
        if (
          data?.ok &&
          Array.isArray(data.results) &&
          !isStaleAlignGeneration(gen, alignGenRef.current) &&
          !advancingRef.current &&
          !ayahCompletedRef.current
        ) {
          setWordResults(data.results);
          resultsRef.current = data.results;
          setCursor(data.cursor);
          cursorRef.current = data.cursor;
          setSessionAccuracy(data.accuracy);
          maybeCompleteAyah(data.cursor);
        }
      } catch {
        /* local result kept */
      }
    },
    [maybeCompleteAyah],
  );

  applyHypothesisRef.current = (chunk, opts) => {
    void applyHypothesis(chunk, opts);
  };

  const bindRecognitionHandlers = useCallback(
    (rec: SpeechRec) => {
      rec.onresult = (ev) => {
        const { finalText, interimText, displayHint } = extractSpeechSegments(
          ev.results,
          ev.resultIndex ?? 0,
        );
        if (displayHint) setListeningHint(displayHint);
        if (finalText) {
          applyHypothesisRef.current(finalText, { permanent: true });
        } else if (interimText.trim()) {
          applyHypothesisRef.current(interimText, { permanent: false });
        }
      };
      rec.onerror = (ev) => {
        if (ev.error === "not-allowed") {
          setError(ar ? "الميكروفون مرفوض" : "Microphone blocked");
          stopRecording();
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
    [ar, stopRecording],
  );

  const restartRecognition = useCallback(() => {
    if (!recordingRef.current) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const old = recognitionRef.current;
    if (old) {
      keepListeningRef.current = false;
      old.onend = null;
      try {
        old.stop();
      } catch {
        /* ignore */
      }
    }

    const rec = new Ctor();
    rec.lang = "ar-SA";
    rec.continuous = true;
    rec.interimResults = true;
    bindRecognitionHandlers(rec);
    recognitionRef.current = rec;
    keepListeningRef.current = true;
    try {
      rec.start();
      setListeningHint(
        ar
          ? `الآية ${verseNumberRef.current} — استمع…`
          : `Ayah ${verseNumberRef.current} — listening…`,
      );
    } catch {
      stopRecording();
    }
  }, [ar, bindRecognitionHandlers, stopRecording]);

  restartRecognitionRef.current = restartRecognition;

  const navigateAyah = useCallback(
    (nextIdx: number) => {
      goToAyahIndex(nextIdx);
      if (recordingRef.current) restartRecognitionRef.current?.();
    },
    [goToAyahIndex],
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
        alignGenRef,
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

  const resetAttempt = () => {
    const wasRecording = recordingRef.current;
    stopRecording();
    resetAyahAttemptState(
      expectedWords,
      {
        expectedRef,
        resultsRef,
        cursorRef,
        hypoAllRef,
        ayahCompletedRef,
        alignGenRef,
      },
      { setWordResults, setCursor, setSessionAccuracy },
    );
    setListeningHint("");
    setElapsed(0);
    if (wasRecording) void startRecording();
  };

  const loadNextRange = () => {
    if (initialAyahTo >= initialAyahCount) return;
    const from = initialAyahTo + 1;
    const to = Math.min(from + TAHFEEZ_MAX_AYAHS - 1, initialAyahCount);
    navigateSession(initialSurahId, from, to);
  };

  const stats = portfolio.stats;
  const currentMeta = surahCatalog.find((s) => s.id === initialSurahId);
  const activeWordIndexes = useMemo(
    () =>
      expectedWords
        .map((w, index) => (normalizeArabicToken(w) ? index : -1))
        .filter((i) => i >= 0),
    [expectedWords],
  );
  const currentWordIndex = activeWordIndexes[cursor] ?? -1;
  const decidedCount = wordResults.filter((w) => w.status !== "pending").length;
  const correctCount = wordResults.filter((w) => w.status === "correct").length;
  const wrongCount = wordResults.filter((w) => w.status === "wrong").length;

  return (
    <main className="shell page-block tahfeez-shell" dir={ar ? "rtl" : "ltr"}>
      <header className="tahfeez-hero">
        <p className="tahfeez-kicker">{ar ? "عربية" : "Arabya"}</p>
        <h1 className="tahfeez-title">
          {ar ? "التسميع الذكي" : "Smart Recitation"}
        </h1>
        <p className="tahfeez-lead">
          {ar
            ? "سمّع أي سورة — كلمة بكلمة — مع متابعة الدقة من حسابك."
            : "Recite any surah — word by word — with accuracy tracked in your account."}
        </p>
      </header>

      {error ? <p className="tahfeez-error" role="alert">{error}</p> : null}

      <section className="tahfeez-setup" aria-label={ar ? "اختيار السورة" : "Surah setup"}>
        <label className="tahfeez-field">
          <span>{ar ? "السورة" : "Surah"}</span>
          <select
            className="tahfeez-select"
            value={initialSurahId}
            onChange={(e) => {
              const id = Number(e.target.value);
              const meta = surahCatalog.find((s) => s.id === id);
              const count = meta?.versesCount || 1;
              navigateSession(id, 1, Math.min(TAHFEEZ_MAX_AYAHS, count));
            }}
          >
            {surahCatalog.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}. {s.name} ({s.versesCount})
              </option>
            ))}
          </select>
        </label>
        <label className="tahfeez-field">
          <span>{ar ? "من آية" : "From ayah"}</span>
          <input
            className="tahfeez-input"
            type="number"
            min={1}
            max={initialAyahCount}
            value={draftFrom}
            onChange={(e) => setDraftFrom(e.target.value)}
          />
        </label>
        <label className="tahfeez-field">
          <span>{ar ? "إلى آية" : "To ayah"}</span>
          <input
            className="tahfeez-input"
            type="number"
            min={1}
            max={initialAyahCount}
            value={draftTo}
            onChange={(e) => setDraftTo(e.target.value)}
          />
        </label>
        <button type="button" className="tahfeez-btn" onClick={applyRange}>
          {ar ? "تحميل النطاق" : "Load range"}
        </button>
        <label className="tahfeez-field">
          <span>{ar ? "القارئ" : "Reciter"}</span>
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
        </label>
      </section>

      <p className="tahfeez-range-note">
        {initialSurahName} · {ar ? "آيات" : "Ayahs"} {initialAyahFrom}–
        {initialAyahTo}
        {currentMeta ? ` / ${currentMeta.versesCount}` : ""} ·{" "}
        {ar
          ? `حد أقصى ${TAHFEEZ_MAX_AYAHS} آية لكل تحميل`
          : `Max ${TAHFEEZ_MAX_AYAHS} ayahs per load`}
      </p>

      <section className="tahfeez-stage" aria-live="polite">
        <div className="tahfeez-stage-head">
          <div>
            <strong>{initialSurahName}</strong>
            <span>
              {" "}
              · {ar ? "آية" : "Ayah"} {verse?.verseNumber || initialAyahFrom}
            </span>
          </div>
          <div className="tahfeez-stage-actions">
            <button
              type="button"
              className="tahfeez-btn tahfeez-btn--ghost"
              onClick={() => setHideText((v) => !v)}
            >
              {hideText
                ? ar
                  ? "إظهار النص"
                  : "Show text"
                : ar
                  ? "إخفاء النص"
                  : "Hide text"}
            </button>
            <button
              type="button"
              className="tahfeez-btn tahfeez-btn--ghost"
              onClick={playAyah}
            >
              {ar ? "استمع" : "Listen"}
            </button>
            <button
              type="button"
              className="tahfeez-btn tahfeez-btn--ghost"
              onClick={stopAudio}
            >
              {ar ? "إيقاف" : "Stop"}
            </button>
          </div>
        </div>

        <div className="tahfeez-progress" aria-hidden>
          <span style={{ width: `${Math.round(audioProgress * 100)}%` }} />
        </div>

        <div
          className="tahfeez-ayah"
          data-hidden={hideText ? "true" : "false"}
          data-recording={recording ? "true" : "false"}
        >
          {wordResults.map((w) => (
            <span
              key={`${w.index}-${w.text}`}
              className="tahfeez-word"
              data-status={w.status}
              data-current={w.index === currentWordIndex ? "true" : "false"}
              title={statusLabel(w.status, ar)}
            >
              <span className="tahfeez-word__text">{w.text}</span>
              {w.status === "correct" || w.status === "wrong" ? (
                <span className="tahfeez-word__mark" aria-hidden>
                  {statusIcon(w.status)}
                </span>
              ) : null}
            </span>
          ))}
        </div>

        <div className="tahfeez-live-legend" aria-hidden={!recording}>
          <span data-tone="correct">
            ✓ {ar ? "صواب" : "OK"} {correctCount}
          </span>
          <span data-tone="wrong">
            ✕ {ar ? "خطأ" : "Wrong"} {wrongCount}
          </span>
          <span data-tone="pending">
            ○ {ar ? "متبقّي" : "Left"}{" "}
            {Math.max(0, activeWordIndexes.length - decidedCount)}
          </span>
        </div>

        <div className="tahfeez-controls">
          <button
            type="button"
            className="tahfeez-btn tahfeez-btn--ghost"
            onClick={() => navigateAyah(ayahIndex - 1)}
            disabled={ayahIndex <= 0}
          >
            {ar ? "السابقة" : "Prev"}
          </button>
          <button
            type="button"
            className="tahfeez-btn tahfeez-btn--ghost"
            onClick={resetAttempt}
          >
            {ar ? "إعادة" : "Reset"}
          </button>
          <button
            type="button"
            className="tahfeez-mic"
            data-on={recording ? "true" : "false"}
            aria-pressed={recording}
            onClick={toggleMic}
          >
            {recording
              ? ar
                ? "إيقاف التسميع"
                : "Stop"
              : ar
                ? "ابدأ التسميع"
                : "Start"}
          </button>
          <button
            type="button"
            className="tahfeez-btn tahfeez-btn--ghost"
            onClick={() => navigateAyah(ayahIndex + 1)}
            disabled={ayahIndex >= initialVerses.length - 1}
          >
            {ar ? "التالية" : "Next"}
          </button>
        </div>

        <p className="tahfeez-status">
          {recording
            ? ar
              ? `${listeningHint || "جاري التسجيل"} · ${elapsed}ث · ${cursor}/${activeWordIndexes.length} · دقة ${sessionAccuracy}%`
              : `${listeningHint || "Recording"} · ${elapsed}s · ${cursor}/${activeWordIndexes.length} · ${sessionAccuracy}%`
            : listeningHint ||
              (ar
                ? "اضغط «ابدأ التسميع» — ينتقل تلقائيًا للآية التالية ضمن النطاق"
                : "Tap Start — auto-advances within the loaded range")}
        </p>
      </section>

      {initialAyahTo < initialAyahCount ? (
        <p className="tahfeez-next-range">
          <button type="button" className="tahfeez-btn" onClick={loadNextRange}>
            {ar
              ? `تحميل الآيات التالية (${initialAyahTo + 1}…)`
              : `Load next ayahs (${initialAyahTo + 1}…)`}
          </button>
        </p>
      ) : null}

      <section className="tahfeez-side" aria-label={ar ? "التقدّم" : "Progress"}>
        <div className="tahfeez-metrics">
          <div>
            <b>{stats.totalSessions}</b>
            <small>{ar ? "جلسات" : "Sessions"}</small>
          </div>
          <div>
            <b>{stats.overallAccuracy}%</b>
            <small>{ar ? "دقة عامة" : "Overall"}</small>
          </div>
          <div>
            <b>{sessionAccuracy}%</b>
            <small>{ar ? "هذه الآية" : "This ayah"}</small>
          </div>
        </div>

        <h2 className="tahfeez-side-title">
          {ar ? "كلمات الآية" : "Ayah words"}
        </h2>
        <ul className="tahfeez-word-list">
          {wordResults.map((w) => (
            <li
              key={w.index}
              data-status={w.status}
              data-current={w.index === currentWordIndex ? "true" : "false"}
            >
              <span className="tahfeez-word-list__text">{w.text}</span>
              <span
                className="tahfeez-word-list__badge"
                aria-label={statusLabel(w.status, ar)}
              >
                {statusIcon(w.status)} {statusLabel(w.status, ar)}
              </span>
            </li>
          ))}
        </ul>

        <h2 className="tahfeez-side-title">
          {ar ? "جلسات أخيرة" : "Recent sessions"}
        </h2>
        <ul className="tahfeez-session-list">
          {portfolio.sessions.slice(0, 8).map((s) => (
            <li key={s.id}>
              <Link
                href={tahfeezHref({
                  surah: s.surahId,
                  from: s.ayahStart,
                  to: s.ayahEnd,
                })}
              >
                {s.surahName} · {s.ayahStart}
                {s.ayahEnd !== s.ayahStart ? `–${s.ayahEnd}` : ""} · {s.accuracy}%
              </Link>
            </li>
          ))}
          {portfolio.sessions.length === 0 ? (
            <li className="tahfeez-muted">
              {ar ? "لا جلسات بعد." : "No sessions yet."}
            </li>
          ) : null}
        </ul>

        <p className="tahfeez-foot-links">
          <Link href="/account/tahfeez">
            {ar ? "تفاصيل التسميع في حسابي" : "Recitation in my account"}
          </Link>
          {" · "}
          <Link href="/mushaf/1">{ar ? "المصحف" : "Mushaf"}</Link>
        </p>
      </section>
    </main>
  );
}
