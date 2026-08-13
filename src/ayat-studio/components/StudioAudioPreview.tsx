"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { Play, Pause, Volume2, VolumeX, Loader2 } from "lucide-react";
import { fetchAyahs, fetchAndDecodeAudio } from "@/ayat-studio/lib/quran-api";
import type { StoredProject } from "@/ayat-studio/lib/projects-store";
import { drawVisualizer, type VisualizerType } from "@/ayat-studio/lib/visualizer";
import { ayahIndexAtTime } from "@/ayat-studio/lib/studio-preview";
import {
  frameProgressBarTopPx,
  normalizeProgressBarStyle,
} from "@/ayat-studio/lib/frame-layout";

type ProgressStore = {
  subscribe: (onStoreChange: () => void) => () => void;
  getSnapshot: () => number;
  set: (value: number) => void;
};

function createProgressStore(): ProgressStore {
  let progress = 0;
  const listeners = new Set<() => void>();
  return {
    subscribe(onStoreChange) {
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    getSnapshot() {
      return progress;
    },
    set(value) {
      const next = Math.max(0, Math.min(1, value));
      if (Math.abs(next - progress) < 0.004 && next !== 0 && next !== 1) return;
      progress = next;
      listeners.forEach((l) => l());
    },
  };
}

type StudioAudioPreviewState = {
  loading: boolean;
  ready: boolean;
  playing: boolean;
  muted: boolean;
  duration: number;
  error: string | null;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  progressStore: ProgressStore;
  play: () => Promise<void>;
  pause: () => void;
  toggleMute: () => void;
};

const StudioAudioPreviewContext =
  createContext<StudioAudioPreviewState | null>(null);

function useStudioAudioPreviewContext(): StudioAudioPreviewState {
  const ctx = useContext(StudioAudioPreviewContext);
  if (!ctx) {
    throw new Error(
      "Studio audio preview components must be wrapped in StudioAudioPreviewProvider",
    );
  }
  return ctx;
}

function useProgress(store: ProgressStore): number {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => 0);
}

function useStudioAudioPreviewLogic(
  project: StoredProject,
  onAyahIndexChange?: (index: number) => void,
): StudioAudioPreviewState {
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const progressStoreRef = useRef<ProgressStore | null>(null);
  if (!progressStoreRef.current) {
    progressStoreRef.current = createProgressStore();
  }
  const progressStore = progressStoreRef.current;

  const ctxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const startTimeRef = useRef(0);
  const startedAtSecRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const segmentsRef = useRef<{ start: number; end: number }[]>([]);
  const lastAyahIndexRef = useRef(-1);
  /** Bumps on pause/stop/new play so stale source.onended cannot clobber UI. */
  const playGenRef = useRef(0);
  const playingRef = useRef(false);

  const onAyahIndexChangeRef = useRef(onAyahIndexChange);
  onAyahIndexChangeRef.current = onAyahIndexChange;

  const reciterId = project.reciterId;
  const surahId = project.surahId;
  const ayahStart = project.ayahStart;
  const ayahEnd = project.ayahEnd;

  const projectRef = useRef(project);
  projectRef.current = project;
  const rateRef = useRef(project.playbackRate ?? 1);
  rateRef.current = project.playbackRate ?? 1;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = muted
        ? 0
        : (project.volume ?? 80) / 100;
    }
  }, [project.volume, muted]);

  useEffect(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.playbackRate.value = Math.max(
          0.75,
          Math.min(1.25, project.playbackRate ?? 1),
        );
      } catch {
        /* ignore */
      }
    }
  }, [project.playbackRate]);

  const clearRaf = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const disconnectSource = () => {
    try {
      sourceRef.current?.stop();
    } catch {
      /* already stopped */
    }
    try {
      sourceRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    sourceRef.current = null;
  };

  const emitAyahIndex = (timeSec: number) => {
    const idx = ayahIndexAtTime(segmentsRef.current, timeSec);
    if (idx !== lastAyahIndexRef.current) {
      lastAyahIndexRef.current = idx;
      onAyahIndexChangeRef.current?.(idx);
    }
  };

  const renderLoopRef = useRef<() => void>(() => {});
  renderLoopRef.current = () => {
    const ctx = ctxRef.current;
    const buffer = bufferRef.current;
    if (!ctx || !buffer || !playingRef.current) {
      rafRef.current = null;
      return;
    }

    const rate = Math.max(0.75, Math.min(1.25, rateRef.current || 1));
    const elapsed =
      (ctx.currentTime - startTimeRef.current) * rate +
      startedAtSecRef.current;
    const dur = buffer.duration || 1;
    progressStore.set(Math.min(elapsed / dur, 1));
    emitAyahIndex(elapsed);

    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    const data = dataRef.current;
    const p = projectRef.current;
    if (canvas && analyser && data) {
      analyser.getByteFrequencyData(data as Uint8Array<ArrayBuffer>);
      const type = (p.visualizer || "bars") as VisualizerType;
      if (type !== "none") {
        drawVisualizer({
          canvas,
          data,
          type,
          color: p.visualizerColor || "#C8A951",
          intensity: (p.visualizerIntensity ?? 60) / 100,
          time: elapsed,
        });
      }
    }

    if (elapsed >= dur - 0.02) {
      playingRef.current = false;
      playGenRef.current += 1;
      clearRaf();
      disconnectSource();
      startedAtSecRef.current = 0;
      progressStore.set(0);
      lastAyahIndexRef.current = -1;
      onAyahIndexChangeRef.current?.(0);
      setPlaying(false);
      return;
    }

    rafRef.current = requestAnimationFrame(() => renderLoopRef.current());
  };

  const stopHard = useCallback(() => {
    playGenRef.current += 1;
    playingRef.current = false;
    clearRaf();
    disconnectSource();
    startedAtSecRef.current = 0;
    progressStore.set(0);
    setPlaying(false);
    lastAyahIndexRef.current = -1;
    onAyahIndexChangeRef.current?.(0);
  }, [progressStore]);

  useEffect(() => {
    stopHard();
    setReady(false);
    bufferRef.current = null;
    segmentsRef.current = [];
    setDuration(0);
  }, [reciterId, surahId, ayahStart, ayahEnd, stopHard]);

  useEffect(() => {
    return () => {
      stopHard();
      ctxRef.current?.close().catch(() => {});
    };
  }, [stopHard]);

  const ensureBuffer = async () => {
    if (bufferRef.current) return bufferRef.current;
    setLoading(true);
    setError(null);
    try {
      const ctx =
        ctxRef.current ??
        new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext)();
      ctxRef.current = ctx;
      const ayahs = await fetchAyahs(surahId, ayahStart, ayahEnd, reciterId);
      const { buffer, segments } = await fetchAndDecodeAudio(ayahs, ctx);
      bufferRef.current = buffer;
      segmentsRef.current = segments.map((s) => ({
        start: s.start,
        end: s.end,
      }));
      setDuration(buffer.duration);
      setReady(true);
      return buffer;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "فشل تحميل الصوت");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const play = useCallback(async () => {
    try {
      // Invalidate any in-flight source / onended from a previous pause.
      playGenRef.current += 1;
      const gen = playGenRef.current;
      clearRaf();
      disconnectSource();

      const buffer = await ensureBuffer();
      if (gen !== playGenRef.current) return;

      const ctx = ctxRef.current!;
      if (ctx.state === "suspended") await ctx.resume();
      if (gen !== playGenRef.current) return;

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gain = ctx.createGain();
      gain.gain.value = mutedRef.current
        ? 0
        : (projectRef.current.volume ?? 80) / 100;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const data = new Uint8Array(analyser.frequencyBinCount);

      source.connect(gain);
      gain.connect(analyser);
      analyser.connect(ctx.destination);

      const rate = Math.max(
        0.75,
        Math.min(1.25, projectRef.current.playbackRate ?? 1),
      );
      source.playbackRate.value = rate;

      sourceRef.current = source;
      gainRef.current = gain;
      analyserRef.current = analyser;
      dataRef.current = data;

      const offset = Math.min(
        Math.max(0, startedAtSecRef.current),
        Math.max(0, buffer.duration - 0.05),
      );
      startTimeRef.current = ctx.currentTime;
      source.start(0, offset);

      playingRef.current = true;
      setPlaying(true);
      emitAyahIndex(offset);
      rafRef.current = requestAnimationFrame(() => renderLoopRef.current());

      source.onended = () => {
        // Ignore stops from pause/stopHard or superseded play() calls.
        if (gen !== playGenRef.current) return;
        if (!playingRef.current) return;
        playingRef.current = false;
        startedAtSecRef.current = 0;
        progressStore.set(0);
        clearRaf();
        sourceRef.current = null;
        setPlaying(false);
        lastAyahIndexRef.current = -1;
        onAyahIndexChangeRef.current?.(0);
      };
    } catch {
      /* error already surfaced */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- buffer load uses current ids via closure; loop via refs
  }, [progressStore, reciterId, surahId, ayahStart, ayahEnd]);

  const pause = useCallback(() => {
    const ctx = ctxRef.current;
    if (ctx && sourceRef.current && playingRef.current) {
      const rate = Math.max(0.75, Math.min(1.25, rateRef.current || 1));
      startedAtSecRef.current =
        (ctx.currentTime - startTimeRef.current) * rate +
        startedAtSecRef.current;
    }
    playGenRef.current += 1;
    playingRef.current = false;
    clearRaf();
    disconnectSource();
    setPlaying(false);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (gainRef.current) {
        gainRef.current.gain.value = next
          ? 0
          : (projectRef.current.volume ?? 80) / 100;
      }
      return next;
    });
  }, []);

  return useMemo(
    () => ({
      loading,
      ready,
      playing,
      muted,
      duration,
      error,
      canvasRef,
      progressStore,
      play,
      pause,
      toggleMute,
    }),
    [
      loading,
      ready,
      playing,
      muted,
      duration,
      error,
      progressStore,
      play,
      pause,
      toggleMute,
    ],
  );
}

export function StudioAudioPreviewProvider({
  project,
  onAyahIndexChange,
  children,
}: {
  project: StoredProject;
  onAyahIndexChange?: (index: number) => void;
  children: ReactNode;
}) {
  const state = useStudioAudioPreviewLogic(project, onAyahIndexChange);
  return (
    <StudioAudioPreviewContext.Provider value={state}>
      {children}
    </StudioAudioPreviewContext.Provider>
  );
}

function StudioProgressBar({
  project,
  frameWidth,
  frameHeight,
}: {
  project: StoredProject;
  frameWidth: number;
  frameHeight: number;
}) {
  const { progressStore } = useStudioAudioPreviewContext();
  const progress = useProgress(progressStore);
  const style = normalizeProgressBarStyle(project.progressBarStyle);
  if (style === "none") return null;

  const barColor = project.progressBarColor || "#C8A951";
  const barTop = frameProgressBarTopPx(frameHeight);
  const barW = frameWidth * 0.7;
  const barLeft = (frameWidth - barW) / 2;
  const pillH = Math.max(8, frameHeight * 0.01);
  const lineH = Math.max(3, frameHeight * 0.005);

  return (
    <div
      className="pointer-events-none absolute z-[6]"
      style={{
        left: barLeft,
        top: barTop,
        width: barW,
        transform: "translateY(-50%)",
      }}
      aria-hidden
    >
      {style === "dots" ? (
        <div className="flex items-center justify-between">
          {Array.from({ length: 24 }).map((_, i) => {
            const active = i / 24 <= progress;
            const r = active ? 3.5 : 2.2;
            return (
              <span
                key={i}
                className="rounded-full"
                style={{
                  width: r * 2,
                  height: r * 2,
                  background: active ? barColor : "rgba(255,255,255,0.25)",
                }}
              />
            );
          })}
        </div>
      ) : (
        <div
          className="w-full overflow-hidden bg-white/20"
          style={{
            height: style === "pill" ? pillH : lineH,
            borderRadius: style === "pill" ? pillH / 2 : 2,
            boxShadow:
              style === "glow"
                ? `0 0 ${Math.max(8, frameWidth * 0.01)}px ${barColor}`
                : undefined,
          }}
        >
          <div
            className="h-full"
            style={{
              width: `${progress * 100}%`,
              background: barColor,
              borderRadius: style === "pill" ? pillH / 2 : 0,
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Visualizer canvas (stable) + progress bar (subscribes separately). */
export function StudioFrameAudioOverlay({
  project,
  frameWidth,
  frameHeight,
}: {
  project: StoredProject;
  frameWidth: number;
  frameHeight: number;
}) {
  const { canvasRef } = useStudioAudioPreviewContext();
  const showViz = (project.visualizer ?? "bars") !== "none";

  return (
    <>
      {showViz ? (
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 z-[5] h-full w-full"
          width={Math.max(1, Math.round(frameWidth))}
          height={Math.max(1, Math.round(frameHeight))}
        />
      ) : null}
      <StudioProgressBar
        project={project}
        frameWidth={frameWidth}
        frameHeight={frameHeight}
      />
    </>
  );
}

export function StudioAudioTransport({
  controlsDock = "below",
}: {
  controlsDock?: "overlay" | "below";
}) {
  const {
    loading,
    ready,
    playing,
    muted,
    duration,
    error,
    progressStore,
    play,
    pause,
    toggleMute,
  } = useStudioAudioPreviewContext();
  const progress = useProgress(progressStore);

  return (
    <>
      <div
        className={
          controlsDock === "below"
            ? "relative z-20 mx-auto mt-2 flex w-full max-w-[min(100%,18rem)] shrink-0 items-center justify-center gap-2 rounded-full border border-accent/30 bg-[hsl(var(--background))] px-3 py-1.5 shadow-md"
            : "absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-accent/30 bg-[hsl(var(--background))] px-3 py-1.5 shadow-md"
        }
      >
        <button
          type="button"
          onClick={() => {
            if (playing) pause();
            else void play();
          }}
          disabled={loading}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground transition hover:scale-110"
          aria-label={playing ? "إيقاف" : "تشغيل"}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : playing ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="ml-0.5 h-3.5 w-3.5" />
          )}
        </button>
        <div className="h-1 w-24 overflow-hidden rounded-full bg-muted/60">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {ready
            ? `${Math.floor(progress * duration)}s / ${Math.floor(duration)}s`
            : "—"}
        </span>
        <button
          type="button"
          onClick={toggleMute}
          className="text-muted-foreground transition hover:text-accent"
          aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
        >
          {muted ? (
            <VolumeX className="h-3.5 w-3.5" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {error && (
        <div className="relative z-20 mx-auto mt-1 rounded-md bg-destructive/90 px-3 py-1 text-center text-[10px] text-destructive-foreground">
          {error}
        </div>
      )}
    </>
  );
}

/** Backward-compatible single-block player (overlay + transport together). */
export function AudioPreviewPlayer({
  project,
  onAyahIndexChange,
  controlsDock = "below",
}: {
  project: StoredProject;
  onAyahIndexChange?: (index: number) => void;
  controlsDock?: "overlay" | "below";
}) {
  return (
    <StudioAudioPreviewProvider
      project={project}
      onAyahIndexChange={onAyahIndexChange}
    >
      <StudioFrameAudioOverlay
        project={project}
        frameWidth={400}
        frameHeight={700}
      />
      <StudioAudioTransport controlsDock={controlsDock} />
    </StudioAudioPreviewProvider>
  );
}
