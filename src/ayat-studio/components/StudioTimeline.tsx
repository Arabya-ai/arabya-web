"use client";

import { useCallback, useRef } from "react";
import {
  useStudioAudioPreview,
  useStudioProgress,
} from "@/ayat-studio/components/StudioAudioPreview";

type Segment = { start: number; end: number };

type Props = {
  ayahLabels: string[];
  activeAyahIndex: number;
};

export function StudioTimeline({ ayahLabels, activeAyahIndex }: Props) {
  const {
    duration,
    segments,
    seek,
    seekToAyah,
    ready,
  } = useStudioAudioPreview();
  const progress = useStudioProgress();
  const trackRef = useRef<HTMLDivElement>(null);

  const pickTime = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || !duration) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      seek(ratio * duration);
    },
    [duration, seek],
  );

  if (!ready || duration <= 0 || segments.length === 0) return null;

  return (
    <div className="studio-timeline" dir="rtl">
      <div
        ref={trackRef}
        className="studio-timeline__track"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={Math.floor(duration)}
        aria-valuenow={Math.floor(progress * duration)}
        aria-label="خط زمني للآيات"
        tabIndex={0}
        onClick={(e) => pickTime(e.clientX)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") seek(Math.max(0, progress * duration - 2));
          if (e.key === "ArrowRight") {
            seek(Math.min(duration, progress * duration + 2));
          }
        }}
      >
        <div
          className="studio-timeline__progress"
          style={{ width: `${progress * 100}%` }}
        />
        {segments.map((seg: Segment, i: number) => {
          const left = (seg.start / duration) * 100;
          const width = Math.max(0.5, ((seg.end - seg.start) / duration) * 100);
          return (
            <button
              key={`${seg.start}-${seg.end}`}
              type="button"
              className={`studio-timeline__marker${
                i === activeAyahIndex ? " is-active" : ""
              }`}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={ayahLabels[i] ?? `آية ${i + 1}`}
              aria-label={ayahLabels[i] ?? `آية ${i + 1}`}
              onClick={(e) => {
                e.stopPropagation();
                seekToAyah(i);
              }}
            />
          );
        })}
      </div>
      <div className="studio-timeline__labels">
        {ayahLabels.map((label, i) => (
          <button
            key={label + i}
            type="button"
            className={`studio-timeline__label${
              i === activeAyahIndex ? " is-active" : ""
            }`}
            onClick={() => seekToAyah(i)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
