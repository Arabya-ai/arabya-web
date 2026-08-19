"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  Download,
} from "lucide-react";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface VideoPreviewProps {
  src: string;
  title?: string;
  onDownload?: () => void;
}

export function VideoPreview({ src, title, onDownload }: VideoPreviewProps) {
  const t = useTranslations("StudioAi");
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowControls(true);
    hideTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => undefined);
    } else {
      v.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      v.requestFullscreen().catch(() => undefined);
    }
  }, []);

  const skip = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + delta));
  }, []);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = progressRef.current;
      const v = videoRef.current;
      if (!bar || !v || !duration) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      v.currentTime = ratio * duration;
      setProgress(ratio * 100);
    },
    [duration],
  );

  return (
    <div className="mpt-video-preview space-y-3">
      {title && (
        <p className="text-center text-[11px] tracking-widest uppercase text-accent/80 sm:text-xs">
          {title}
        </p>
      )}

      <div
        className="group relative overflow-hidden rounded-2xl border border-primary/25 bg-black shadow-deep"
        onMouseMove={scheduleHide}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => {
          if (playing) setShowControls(false);
        }}
      >
        <video
          ref={videoRef}
          src={src}
          playsInline
          preload="metadata"
          className="block w-full"
          onClick={togglePlay}
          onPlay={() => {
            setPlaying(true);
            scheduleHide();
          }}
          onPause={() => {
            setPlaying(false);
            setShowControls(true);
          }}
          onTimeUpdate={() => {
            const v = videoRef.current;
            if (!v || seeking) return;
            setCurrentTime(v.currentTime);
            if (v.duration) setProgress((v.currentTime / v.duration) * 100);
          }}
          onLoadedMetadata={() => {
            const v = videoRef.current;
            if (v) setDuration(v.duration);
          }}
          onEnded={() => {
            setPlaying(false);
            setShowControls(true);
          }}
        />

        {/* Big center play overlay */}
        {!playing && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 transition hover:bg-black/40"
            aria-label={t("previewPlay")}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white/15 backdrop-blur-sm transition-transform hover:scale-110">
              <Play className="h-7 w-7 text-white" fill="currentColor" />
            </div>
          </button>
        )}

        {/* Bottom transport controls */}
        <div
          className={`absolute inset-x-0 bottom-0 z-20 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <div className="bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pb-3 pt-6">
            {/* Progress bar */}
            <div
              ref={progressRef}
              className="group/bar mb-2.5 h-1.5 cursor-pointer rounded-full bg-white/20"
              onClick={handleSeek}
              onMouseDown={() => setSeeking(true)}
              onMouseUp={() => setSeeking(false)}
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => skip(-10)}
                  className="rounded-full p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
                  aria-label={t("previewBack")}
                >
                  <SkipBack className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="rounded-full p-1.5 text-white/90 transition hover:bg-white/15 hover:text-white"
                  aria-label={playing ? t("previewPause") : t("previewPlay")}
                >
                  {playing ? (
                    <Pause className="h-5 w-5" fill="currentColor" />
                  ) : (
                    <Play className="h-5 w-5" fill="currentColor" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => skip(10)}
                  className="rounded-full p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
                  aria-label={t("previewForward")}
                >
                  <SkipForward className="h-4 w-4" />
                </button>
                <span className="ms-1.5 text-xs tabular-nums text-white/70">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="rounded-full p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
                  aria-label={muted ? t("previewUnmute") : t("previewMute")}
                >
                  {muted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
                {onDownload && (
                  <button
                    type="button"
                    onClick={onDownload}
                    className="rounded-full p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
                    aria-label={t("download")}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="rounded-full p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
                  aria-label={t("previewFullscreen")}
                >
                  <Maximize className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
