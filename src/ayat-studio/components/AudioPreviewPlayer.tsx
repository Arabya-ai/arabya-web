"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Loader2 } from "lucide-react";
import { fetchAyahs, fetchAndDecodeAudio } from "@/ayat-studio/lib/quran-api";
import type { StoredProject } from "@/ayat-studio/lib/projects-store";
import { drawVisualizer, type VisualizerType } from "@/ayat-studio/lib/visualizer";

interface Props {
  project: StoredProject;
}

/**
 * Live preview audio player with reactive visualizer overlay.
 * Loads audio lazily on first play, then renders visualizer onto an absolutely-positioned canvas.
 */
export function AudioPreviewPlayer({ project }: Props) {
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

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

  const reciterId = project.reciterId;
  const surahId = project.surahId;
  const ayahStart = project.ayahStart;
  const ayahEnd = project.ayahEnd;

  // Reset when source changes
  useEffect(() => {
    stop();
    setReady(false);
    bufferRef.current = null;
    setProgress(0);
    setDuration(0);
  }, [reciterId, surahId, ayahStart, ayahEnd]);

  useEffect(() => {
    return () => {
      stop();
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  const ensureBuffer = async () => {
    if (bufferRef.current) return bufferRef.current;
    setLoading(true);
    setError(null);
    try {
      const ctx = ctxRef.current ?? new (window.AudioContext || (window as any).webkitAudioContext)();
      ctxRef.current = ctx;
      const ayahs = await fetchAyahs(surahId, ayahStart, ayahEnd, reciterId);
      const { buffer } = await fetchAndDecodeAudio(ayahs, ctx);
      bufferRef.current = buffer;
      setDuration(buffer.duration);
      setReady(true);
      return buffer;
    } catch (e: any) {
      setError(e?.message || "فشل تحميل الصوت");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const renderLoop = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    const data = dataRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !analyser || !data || !ctx) return;

    analyser.getByteFrequencyData(data as any);
    const elapsed = ctx.currentTime - startTimeRef.current + startedAtSecRef.current;
    setProgress(Math.min(elapsed / (bufferRef.current?.duration || 1), 1));

    drawVisualizer({
      canvas,
      data,
      type: (project.visualizer || "bars") as VisualizerType,
      color: project.visualizerColor || "#C8A951",
      intensity: (project.visualizerIntensity ?? 60) / 100,
    });

    if (elapsed >= (bufferRef.current?.duration || 0)) {
      stop();
      return;
    }
    rafRef.current = requestAnimationFrame(renderLoop);
  };

  const play = async () => {
    try {
      const buffer = await ensureBuffer();
      const ctx = ctxRef.current!;
      if (ctx.state === "suspended") await ctx.resume();

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gain = ctx.createGain();
      gain.gain.value = muted ? 0 : (project.volume ?? 80) / 100;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const data = new Uint8Array(analyser.frequencyBinCount);

      source.connect(gain);
      gain.connect(analyser);
      analyser.connect(ctx.destination);

      sourceRef.current = source;
      gainRef.current = gain;
      analyserRef.current = analyser;
      dataRef.current = data;

      startTimeRef.current = ctx.currentTime;
      startedAtSecRef.current = 0;
      source.start(0);
      setPlaying(true);
      rafRef.current = requestAnimationFrame(renderLoop);

      source.onended = () => setPlaying(false);
    } catch {
      // error already surfaced
    }
  };

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    try {
      sourceRef.current?.stop();
    } catch {}
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    setPlaying(false);
  };

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      if (gainRef.current) gainRef.current.gain.value = next ? 0 : (project.volume ?? 80) / 100;
      return next;
    });
  };

  return (
    <>
      {/* Visualizer canvas overlay */}
      {(project.visualizer ?? "bars") !== "none" && (
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 z-[5] h-full w-full"
          width={400}
          height={700}
        />
      )}

      {/* Controls */}
      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-accent/30 bg-background/70 px-3 py-1.5 backdrop-blur-md">
        <button
          onClick={playing ? stop : play}
          disabled={loading}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground hover:scale-110 transition"
          aria-label={playing ? "إيقاف" : "تشغيل"}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
        </button>
        <div className="h-1 w-24 overflow-hidden rounded-full bg-muted/60">
          <div className="h-full bg-accent transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {ready ? `${Math.floor(progress * duration)}s / ${Math.floor(duration)}s` : "—"}
        </span>
        <button onClick={toggleMute} className="text-muted-foreground hover:text-accent transition" aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}>
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {error && (
        <div className="absolute top-2 left-1/2 z-20 -translate-x-1/2 rounded-md bg-destructive/90 px-3 py-1 text-[10px] text-destructive-foreground">
          {error}
        </div>
      )}
    </>
  );
}
