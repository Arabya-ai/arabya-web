"use client";

import { useEffect } from "react";
import {
  useStudioAudioPreview,
  useStudioProgress,
} from "@/ayat-studio/components/StudioAudioPreview";

/** Space = play/pause · ←/→ = ±2s · Home/End = start/end. */
export function StudioKeyboardShortcuts() {
  const { playing, play, pause, seek, duration, ready } = useStudioAudioPreview();
  const progress = useStudioProgress();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (e.target as HTMLElement | null)?.isContentEditable
      ) {
        return;
      }
      if (!ready || duration <= 0) return;

      const current = progress * duration;

      if (e.code === "Space") {
        e.preventDefault();
        if (playing) pause();
        else void play();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        seek(Math.max(0, current - 2));
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        seek(Math.min(duration, current + 2));
        return;
      }
      if (e.key === "Home") {
        e.preventDefault();
        seek(0);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        seek(duration);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [duration, pause, play, playing, progress, ready, seek]);

  return null;
}
