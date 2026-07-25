"use client";

import { useTranslations } from "next-intl";
import type { SurahPlayerState } from "@/hooks/useQuranAudio";
import { toArabicNumerals } from "@/lib/format";

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path fill="currentColor" d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M7 5h3.5a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm6.5 0H17a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-3.5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
      />
    </svg>
  );
}

function IconPin({ pinned }: { pinned: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill={pinned ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 17v5" />
      <path d="m15 4.5 1.5 4.5H21l-3.8 3.2L18.5 18 12 14.2 5.5 18l1.3-5.8L3 9h4.5L9 4.5 12 2l3 2.5z" />
    </svg>
  );
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
  const t = useTranslations("Mushaf");
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
      aria-label={t("playerAria")}
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
                : t("playerVerseOf", {
                  current: toArabicNumerals(state.verseIndex),
                  total: toArabicNumerals(state.versesCount),
                })}
            </p>
          </div>
        </div>
        <div className="surah-player-actions">
          <button
            type="button"
            className={`surah-player-pin${state.pinned ? " is-on" : ""}`}
            onClick={() => onPin(!state.pinned)}
            aria-pressed={state.pinned}
            title={state.pinned ? t("unpin") : t("pin")}
          >
            <IconPin pinned={state.pinned} />
            <span>{state.pinned ? t("unpin") : t("pin")}</span>
          </button>
          <button
            type="button"
            className="surah-player-close"
            onClick={onClose}
            aria-label={t("closePlayer")}
            title={t("closePlayer")}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="surah-player-controls">
        <button
          type="button"
          className={`surah-player-play${state.playing ? " is-playing" : ""}`}
          onClick={() => (state.playing ? onPause() : onResume())}
          aria-label={state.playing ? t("pause") : t("play")}
          title={state.playing ? t("pause") : t("play")}
        >
          {state.playing ? <IconPause /> : <IconPlay />}
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
            aria-label={t("seekAria")}
            dir="ltr"
          />
        ) : (
          <div className="surah-player-bar" aria-hidden>
            <span style={{ width: `${progress}%` }} />
          </div>
        )}

        <label className="surah-player-rate">
          <span className="sr-only">{t("speed")}</span>
          <select
            value={state.playbackRate}
            onChange={(e) => onRate(Number(e.target.value))}
            aria-label={t("speed")}
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
