"use client";

import type { SurahPlayerState } from "@/hooks/useQuranAudio";
import { toArabicNumerals } from "@/lib/format";

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function SurahAudioPlayer({
  state,
  onPause,
  onResume,
  onSeek,
  onRate,
  onPin,
  onClose,
}: {
  state: SurahPlayerState;
  onPause: () => void;
  onResume: () => void;
  onSeek: (t: number) => void;
  onRate: (r: number) => void;
  onPin: (pinned: boolean) => void;
  onClose: () => void;
}) {
  if (!state.active) return null;

  const progress =
    state.mode === "chapter" && state.duration > 0
      ? Math.min(100, (state.currentTime / state.duration) * 100)
      : state.versesCount > 0
        ? Math.min(100, (state.verseIndex / state.versesCount) * 100)
        : 0;

  return (
    <div
      className={`surah-player${state.pinned ? " is-pinned" : ""}`}
      role="region"
      aria-label="مشغّل تلاوة السورة"
    >
      <div className="surah-player-head">
        <div className="surah-player-title">
          <span className="surah-player-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </span>
          <div>
            <strong>{state.title}</strong>
            <p>
              {state.mode === "chapter"
                ? `${formatTime(state.currentTime)} / ${formatTime(state.duration)}`
                : `آية ${toArabicNumerals(state.verseIndex)} من ${toArabicNumerals(state.versesCount)}`}
            </p>
          </div>
        </div>
        <div className="surah-player-actions">
          <button
            type="button"
            className={`tool-btn${state.pinned ? " is-on" : ""}`}
            onClick={() => onPin(!state.pinned)}
            aria-pressed={state.pinned}
            title={
              state.pinned
                ? "إلغاء التثبيت — المشغّل يعود لمكانه فوق المصحف"
                : "تثبيت المشغّل أسفل الشاشة أثناء التصفح"
            }
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 17v5" />
              <path d="M5 9.5 9 3h6l4 6.5-6.5 3.5L5 9.5z" />
            </svg>
            {state.pinned ? "مثبّت" : "تثبيت"}
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={onClose}
            aria-label="إغلاق المشغّل"
            title="إغلاق"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="surah-player-controls">
        <button
          type="button"
          className="tool-btn surah-player-play"
          onClick={() => (state.playing ? onPause() : onResume())}
          aria-label={state.playing ? "إيقاف مؤقت" : "تشغيل"}
        >
          {state.playing ? "⏸" : "▶"}
        </button>

        {state.mode === "chapter" ? (
          <input
            type="range"
            className="surah-player-seek"
            min={0}
            max={Math.max(1, state.duration)}
            step={0.1}
            value={Math.min(state.currentTime, state.duration || 0)}
            onChange={(e) => onSeek(Number(e.target.value))}
            aria-label="موضع التلاوة"
            dir="ltr"
          />
        ) : (
          <div className="surah-player-bar" aria-hidden>
            <span style={{ width: `${progress}%` }} />
          </div>
        )}

        <label className="surah-player-rate">
          <span className="sr-only">السرعة</span>
          <select
            value={state.playbackRate}
            onChange={(e) => onRate(Number(e.target.value))}
            aria-label="سرعة التلاوة"
          >
            {[0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => (
              <option key={r} value={r}>
                {r}×
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
