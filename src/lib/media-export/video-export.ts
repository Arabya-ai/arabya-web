/**
 * Client-side MP4 export (adapted from ayat-creator-pro / آيات ستوديو).
 * Uses Arabya reciters + QPC ayah text passed in — no alquran.cloud.
 */
import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { getReciter, reciterDisplayName } from "@/lib/audio";
import {
  ARABYA_MARK_PUBLIC_PATH,
  ARABYA_SITE_HOST,
  arabyaBrandName,
  drawArabyaExportBrand,
} from "@/lib/brand-export";
import {
  drawVisualizer,
  type VisualizerType,
} from "@/lib/media-export/visualizer";
import type { ImageAspect } from "@/lib/plans";
import { imageSizeForAspect } from "@/lib/plans";

export type CreateVideoProject = {
  surahId: number;
  surahName: string;
  ayahStart: number;
  ayahEnd: number;
  /** verseNumber → Uthmani text */
  ayahTexts: Record<number, string>;
  reciterId: string;
  ratio: ImageAspect;
  quality: "standard" | "high";
  textColor: string;
  overlayOpacity: number;
  overlayPosition: "top" | "center" | "bottom";
  fontSize: number;
  bgUrl?: string;
  visualizer?: VisualizerType;
  locale?: string;
};

export type AyahMedia = {
  numberInSurah: number;
  text: string;
  audioUrl: string;
};

/** Same-origin EveryAyah proxy (CSP/CORS-safe). */
export function proxiedAyahAudioUrl(
  surahId: number,
  ayahInSurah: number,
  reciterId: string,
): string {
  const folder = getReciter(reciterId).folder;
  const q = new URLSearchParams({
    folder,
    s: String(surahId),
    v: String(ayahInSurah),
  });
  return `/api/create/audio?${q.toString()}`;
}

export function buildAyahMedia(project: CreateVideoProject): AyahMedia[] {
  const out: AyahMedia[] = [];
  for (let n = project.ayahStart; n <= project.ayahEnd; n++) {
    const text = project.ayahTexts[n];
    if (!text) continue;
    out.push({
      numberInSurah: n,
      text,
      // Prefer same-origin proxy; keep direct URL helper for tests/docs only.
      audioUrl: proxiedAyahAudioUrl(project.surahId, n, project.reciterId),
    });
  }
  return out;
}

async function fetchAndDecodeAudio(
  ayahs: AyahMedia[],
  audioCtx: AudioContext,
): Promise<{
  buffer: AudioBuffer;
  segments: {
    start: number;
    end: number;
    text: string;
    numberInSurah: number;
  }[];
}> {
  const buffers = await Promise.all(
    ayahs.map(async (a) => {
      const res = await fetch(a.audioUrl, {
        mode: "cors",
        credentials: "same-origin",
      });
      if (!res.ok) {
        throw new Error(`audio_http_${a.numberInSurah}_${res.status}`);
      }
      const arr = await res.arrayBuffer();
      return await new Promise<AudioBuffer>((resolve, reject) => {
        audioCtx.decodeAudioData(arr.slice(0), resolve, reject);
      });
    }),
  );

  const sampleRate = buffers[0].sampleRate;
  const channels = Math.max(...buffers.map((b) => b.numberOfChannels));
  const totalLength = buffers.reduce((s, b) => s + b.length, 0);
  const out = audioCtx.createBuffer(channels, totalLength, sampleRate);
  const segments: {
    start: number;
    end: number;
    text: string;
    numberInSurah: number;
  }[] = [];
  let offset = 0;
  buffers.forEach((b, i) => {
    for (let ch = 0; ch < channels; ch++) {
      const src = b.getChannelData(Math.min(ch, b.numberOfChannels - 1));
      out.getChannelData(ch).set(src, offset);
    }
    const startSec = offset / sampleRate;
    offset += b.length;
    segments.push({
      start: startSec,
      end: offset / sampleRate,
      text: ayahs[i].text,
      numberInSurah: ayahs[i].numberInSurah,
    });
  });
  return { buffer: out, segments };
}

async function computeFreqPerFrame(
  buffer: AudioBuffer,
  totalFrames: number,
  fps: number,
): Promise<Uint8Array[]> {
  const sr = buffer.sampleRate;
  const samplesPerFrame = Math.floor(sr / fps);
  const mono = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < ch.length; i++) mono[i] += ch[i] / buffer.numberOfChannels;
  }
  const bins = 64;
  const out: Uint8Array[] = new Array(totalFrames);
  for (let f = 0; f < totalFrames; f++) {
    const start = f * samplesPerFrame;
    const end = Math.min(start + samplesPerFrame, mono.length);
    const seg = mono.subarray(start, end);
    const data = new Uint8Array(bins);
    const subLen = Math.max(1, Math.floor(seg.length / bins));
    for (let b = 0; b < bins; b++) {
      const sStart = b * subLen;
      const sEnd = Math.min(sStart + subLen, seg.length);
      let sum = 0;
      for (let i = sStart; i < sEnd; i++) sum += seg[i] * seg[i];
      const rms = Math.sqrt(sum / Math.max(1, sEnd - sStart));
      data[b] = Math.round(Math.min(1, Math.pow(rms * 4.5, 0.6)) * 255);
    }
    out[f] = data;
  }
  return out;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  const trimmed = lines.slice(0, 6);
  const startY = y - ((trimmed.length - 1) / 2) * lineHeight;
  trimmed.forEach((line, i) => ctx.fillText(line, x, startY + i * lineHeight));
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  opts: {
    width: number;
    height: number;
    bgImage: HTMLImageElement | null;
    project: CreateVideoProject;
    ayahText: string;
    ayahNumber: number;
    reciterName: string;
    progress: number;
  },
) {
  const {
    width,
    height,
    bgImage,
    project,
    ayahText,
    ayahNumber,
    reciterName,
    progress,
  } = opts;
  if (bgImage) {
    const ir = bgImage.width / bgImage.height;
    const cr = width / height;
    let dw = width;
    let dh = height;
    let dx = 0;
    let dy = 0;
    if (ir > cr) {
      dh = height;
      dw = height * ir;
      dx = (width - dw) / 2;
    } else {
      dw = width;
      dh = width / ir;
      dy = (height - dh) / 2;
    }
    ctx.drawImage(bgImage, dx, dy, dw, dh);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#0f766e");
    grad.addColorStop(1, "#0b1412");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.fillStyle = `rgba(0,0,0,${project.overlayOpacity / 100})`;
  ctx.fillRect(0, 0, width, height);

  let yCenter = height * 0.5;
  if (project.overlayPosition === "top") yCenter = height * 0.28;
  if (project.overlayPosition === "bottom") yCenter = height * 0.7;

  ctx.fillStyle = "rgba(153,246,228,0.95)";
  ctx.font = `${Math.round(width * 0.025)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(
    `${project.surahName} · ${ayahNumber}`,
    width / 2,
    yCenter - height * 0.2,
  );

  ctx.fillStyle = project.textColor;
  const fontPx = Math.round((project.fontSize / 48) * width * 0.055);
  ctx.font = `bold ${fontPx}px "Noto Naskh Arabic", "Amiri", serif`;
  ctx.direction = "rtl";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 14;
  wrapText(ctx, ayahText, width / 2, yCenter, width * 0.85, fontPx * 1.55);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `${Math.round(width * 0.022)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(reciterName, width / 2, height - height * 0.11);

  const barW = width * 0.7;
  const barH = Math.max(3, height * 0.005);
  const barX = (width - barW) / 2;
  const barY = height - height * 0.085;
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = "rgba(153,246,228,0.95)";
  ctx.fillRect(barX, barY, barW * progress, barH);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function downloadBlob(blob: Blob, filename: string): string {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return url;
}

export function supportsWebCodecsExport(): boolean {
  return (
    typeof VideoEncoder !== "undefined" && typeof AudioEncoder !== "undefined"
  );
}

export async function exportProjectToVideo(opts: {
  project: CreateVideoProject;
  onProgress?: (pct: number, label?: string) => void;
}): Promise<Blob> {
  const { project, onProgress } = opts;
  if (!supportsWebCodecsExport()) {
    throw new Error("webcodecs_unsupported");
  }

  const size = imageSizeForAspect(project.ratio);
  const scale = project.quality === "standard" ? 0.5 : 1;
  const width = Math.round((size.width * scale) / 2) * 2;
  const height = Math.round((size.height * scale) / 2) * 2;

  onProgress?.(0, "fetch");
  const ayahs = buildAyahMedia(project);
  if (!ayahs.length) throw new Error("no_ayahs");

  const audioCtx = new AudioContext();
  const { buffer: audioBuffer, segments } = await fetchAndDecodeAudio(
    ayahs,
    audioCtx,
  );
  const totalDuration = audioBuffer.duration;
  onProgress?.(10, "prepare");

  let bgImage: HTMLImageElement | null = null;
  if (project.bgUrl) {
    bgImage = await loadImage(project.bgUrl).catch(() => null);
  }

  const brandMark = await loadImage(ARABYA_MARK_PUBLIC_PATH).catch(() => null);

  const reciter = getReciter(project.reciterId);
  const reciterName = reciterDisplayName(reciter, project.locale || "ar");

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false })!;

  const fps = 30;
  const totalFrames = Math.ceil(totalDuration * fps);
  const freqPerFrame = await computeFreqPerFrame(audioBuffer, totalFrames, fps);

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width, height, frameRate: fps },
    audio: {
      codec: "aac",
      numberOfChannels: 2,
      sampleRate: audioBuffer.sampleRate,
    },
    fastStart: "in-memory",
  });

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error(e),
  });
  videoEncoder.configure({
    codec: "avc1.4d0028",
    width,
    height,
    bitrate: project.quality === "standard" ? 2_500_000 : 5_000_000,
    framerate: fps,
    avc: { format: "avc" },
  });

  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (e) => console.error(e),
  });
  audioEncoder.configure({
    codec: "mp4a.40.2",
    numberOfChannels: 2,
    sampleRate: audioBuffer.sampleRate,
    bitrate: 128_000,
  });

  onProgress?.(15, "encode");
  const audioSampleRate = audioBuffer.sampleRate;
  const totalSamples = audioBuffer.length;
  const audioChunkSize = Math.floor(audioSampleRate * 0.1);
  const ch0 = audioBuffer.getChannelData(0);
  const ch1 =
    audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;

  const audioPromise = (async () => {
    for (let i = 0; i < totalSamples; i += audioChunkSize) {
      const len = Math.min(audioChunkSize, totalSamples - i);
      const interleaved = new Float32Array(len * 2);
      for (let j = 0; j < len; j++) {
        interleaved[j * 2] = ch0[i + j];
        interleaved[j * 2 + 1] = ch1[i + j];
      }
      const audioData = new AudioData({
        format: "f32",
        sampleRate: audioSampleRate,
        numberOfFrames: len,
        numberOfChannels: 2,
        timestamp: Math.round((i / audioSampleRate) * 1_000_000),
        data: interleaved,
      });
      audioEncoder.encode(audioData);
      audioData.close();
    }
    await audioEncoder.flush();
    audioEncoder.close();
  })();

  const visualizer = (project.visualizer || "bars") as VisualizerType;

  for (let frame = 0; frame < totalFrames; frame++) {
    const timeSec = frame / fps;
    const segIdx = segments.findIndex(
      (s) => timeSec >= s.start && timeSec < s.end,
    );
    const current =
      segIdx >= 0 ? segments[segIdx] : segments[segments.length - 1];

    drawFrame(ctx, {
      width,
      height,
      bgImage,
      project,
      ayahText: current.text,
      ayahNumber: current.numberInSurah,
      reciterName,
      progress: timeSec / totalDuration,
    });

    if (visualizer !== "none") {
      drawVisualizer({
        canvas,
        data: freqPerFrame[frame] || new Uint8Array(64),
        type: visualizer,
        color: "#99f6e4",
        intensity: 0.65,
        clear: false,
      });
    }

    // Always brand mushaf/create video exports after overlays: mark + name + site URL.
    drawArabyaExportBrand(ctx, {
      width,
      height,
      markImg: brandMark,
      locale: project.locale,
      required: true,
      title: arabyaBrandName(project.locale),
      subtitle: ARABYA_SITE_HOST,
    });

    const videoFrame = new VideoFrame(canvas, {
      timestamp: Math.round((frame / fps) * 1_000_000),
      duration: Math.round((1 / fps) * 1_000_000),
    });
    while (videoEncoder.encodeQueueSize >= 4) {
      await new Promise((r) => setTimeout(r, 0));
    }
    videoEncoder.encode(videoFrame, { keyFrame: frame % 30 === 0 });
    videoFrame.close();

    if (frame % 10 === 0) {
      onProgress?.(15 + Math.round((frame / totalFrames) * 70), "encode");
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  await videoEncoder.flush();
  videoEncoder.close();
  await audioPromise;
  muxer.finalize();
  const target = muxer.target as ArrayBufferTarget;
  await audioCtx.close();
  onProgress?.(100, "done");
  return new Blob([new Uint8Array(target.buffer)], { type: "video/mp4" });
}
