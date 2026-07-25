// Real video export with audio using WebCodecs + mp4-muxer (true MP4 output)
import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import type { StoredProject } from "./projects-store";
import { reciters, surahs, aspectRatios } from "./quran-data";
import { fetchAyahs, fetchAndDecodeAudio } from "./quran-api";
import { drawVisualizer, type VisualizerType } from "./visualizer";

interface ExportOptions {
  project: StoredProject;
  onProgress?: (pct: number, label?: string) => void;
}

export async function exportProjectToVideo({
  project,
  onProgress,
}: ExportOptions): Promise<Blob> {
  if (typeof VideoEncoder === "undefined" || typeof AudioEncoder === "undefined") {
    throw new Error("متصفحك لا يدعم تصدير MP4. الرجاء استخدام Chrome أو Edge الحديث.");
  }

  const ratio = aspectRatios.find((r) => r.id === project.ratio) || aspectRatios[0];
  const scale = project.quality === "standard" ? 0.5 : project.quality === "ultra" ? 1.5 : 1;
  const width = Math.round((ratio.width * scale) / 2) * 2;
  const height = Math.round((ratio.height * scale) / 2) * 2;

  onProgress?.(0, "جلب الآيات والصوت...");

  const ayahs = await fetchAyahs(project.surahId, project.ayahStart, project.ayahEnd, project.reciterId);
  if (ayahs.length === 0) throw new Error("لم يتم العثور على آيات");

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const { buffer: audioBuffer, segments } = await fetchAndDecodeAudio(ayahs, audioCtx);
  const audioSampleRate = audioBuffer.sampleRate;
  const totalDuration = audioBuffer.duration;
  onProgress?.(10, "تحضير المحرر...");

  const isVideoBg = (project.bgType === "image" || project.bgType === "url") && project.bgKind === "video" && !!project.bgUrl;
  let bgImage: HTMLImageElement | null = null;
  let bgVideo: HTMLVideoElement | null = null;
  let bgVideoDuration = 0;
  if (isVideoBg) {
    try {
      bgVideo = await loadVideo(project.bgUrl);
      bgVideoDuration = isFinite(bgVideo.duration) && bgVideo.duration > 0 ? bgVideo.duration : 0;
    } catch (e) {
      console.warn("Failed to load background video, falling back to gradient:", e);
      bgVideo = null;
    }
  } else if ((project.bgType === "image" || project.bgType === "url") && project.bgUrl) {
    bgImage = await loadImage(project.bgUrl).catch(() => null);
  }

  const surah = surahs.find((s) => s.id === project.surahId);
  const reciter = reciters.find((r) => r.id === project.reciterId);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false })!;

  // Pre-compute audio frequency data per video frame using OfflineAudioContext analysis pass
  const fps = 30;
  const totalFrames = Math.ceil(totalDuration * fps);
  const freqPerFrame = await computeFreqPerFrame(audioBuffer, totalFrames, fps);

  // Setup MP4 muxer
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width, height, frameRate: fps },
    audio: { codec: "aac", numberOfChannels: 2, sampleRate: audioSampleRate },
    fastStart: "in-memory",
  });

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error("Video encode error:", e),
  });

  const codedArea = width * height;
  let avcCodec = "avc1.4d0028";
  if (codedArea > 9_437_184) avcCodec = "avc1.640034";
  else if (codedArea > 5_652_480) avcCodec = "avc1.640033";
  else if (codedArea > 2_228_224) avcCodec = "avc1.640032";
  else if (codedArea > 2_097_152) avcCodec = "avc1.64002a";

  videoEncoder.configure({
    codec: avcCodec,
    width,
    height,
    bitrate: project.quality === "ultra" ? 10_000_000 : project.quality === "standard" ? 2_500_000 : 5_000_000,
    framerate: fps,
    avc: { format: "avc" },
  });

  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (e) => console.error("Audio encode error:", e),
  });
  audioEncoder.configure({
    codec: "mp4a.40.2",
    numberOfChannels: 2,
    sampleRate: audioSampleRate,
    bitrate: 128_000,
  });

  onProgress?.(15, "ترميز الفيديو والصوت...");

  const totalSamples = audioBuffer.length;
  const audioChunkSize = Math.floor(audioSampleRate * 0.1);
  const ch0 = audioBuffer.getChannelData(0);
  const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;

  const waitForVideoEncoderCapacity = async (maxQueueSize = 4) => {
    while (videoEncoder.encodeQueueSize >= maxQueueSize) {
      await new Promise((r) => setTimeout(r, 0));
    }
  };

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
      if ((i / audioChunkSize) % 20 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    await audioEncoder.flush();
    audioEncoder.close();
  })();

  const transition = project.transition || "fade";
  const transDur = project.transitionDuration ?? 0.6;
  const visualizer = (project.visualizer || "bars") as VisualizerType;
  const visualizerColor = project.visualizerColor || "#C8A951";
  const visualizerIntensity = (project.visualizerIntensity ?? 60) / 100;

  for (let frame = 0; frame < totalFrames; frame++) {
    const timeSec = frame / fps;
    const segIdx = segments.findIndex((s) => timeSec >= s.start && timeSec < s.end);
    const currentSegment = segIdx >= 0 ? segments[segIdx] : segments[segments.length - 1];
    const inSegT = timeSec - currentSegment.start;
    const segLen = currentSegment.end - currentSegment.start;

    const enterProgress = Math.min(1, inSegT / Math.max(0.01, transDur));
    const exitProgress = Math.min(1, Math.max(0, (segLen - inSegT) / Math.max(0.01, transDur)));

    if (bgVideo && bgVideoDuration > 0) {
      const t = timeSec % bgVideoDuration;
      await seekVideo(bgVideo, t);
    }

    drawFrame(ctx, {
      width,
      height,
      bgImage,
      bgVideo,
      project,
      ayahText: currentSegment.text,
      surahName: surah?.name || "",
      ayahNumber: currentSegment.numberInSurah,
      reciterName: reciter?.name || "",
      progress: timeSec / totalDuration,
      transition,
      enterProgress,
      exitProgress,
      kenburnsT: timeSec / totalDuration,
    });

    if (visualizer !== "none") {
      drawVisualizer({
        canvas,
        data: freqPerFrame[frame] || new Uint8Array(64),
        type: visualizer,
        color: visualizerColor,
        intensity: visualizerIntensity,
        clear: false,
      });
    }

    const videoFrame = new VideoFrame(canvas, {
      timestamp: Math.round((frame / fps) * 1_000_000),
      duration: Math.round((1 / fps) * 1_000_000),
    });

    await waitForVideoEncoderCapacity();
    videoEncoder.encode(videoFrame, { keyFrame: frame % 30 === 0 });
    videoFrame.close();

    if (frame % 10 === 0) {
      const pct = 15 + Math.round((frame / totalFrames) * 70);
      onProgress?.(pct, "ترميز الفيديو...");
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  onProgress?.(86, "إنهاء ترميز الفيديو...");
  await videoEncoder.flush();
  videoEncoder.close();

  onProgress?.(92, "إنهاء ترميز الصوت...");
  await audioPromise;

  onProgress?.(95, "إنهاء الملف...");
  muxer.finalize();
  const target = muxer.target as ArrayBufferTarget;
  const mp4Blob = new Blob([target.buffer], { type: "video/mp4" });

  audioCtx.close();
  onProgress?.(100, "اكتمل");
  return mp4Blob;
}

/**
 * Compute byte-frequency data per video frame by stepping through the AudioBuffer in chunks.
 * Uses a simple time-domain RMS distributed across frequency bins (no full FFT to keep it fast/simple).
 */
async function computeFreqPerFrame(buffer: AudioBuffer, totalFrames: number, fps: number): Promise<Uint8Array[]> {
  const sr = buffer.sampleRate;
  const samplesPerFrame = Math.floor(sr / fps);
  const channels = buffer.numberOfChannels;
  const bins = 64;
  const out: Uint8Array[] = new Array(totalFrames);

  // Mix down to mono once
  const mono = new Float32Array(buffer.length);
  for (let c = 0; c < channels; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < ch.length; i++) mono[i] += ch[i] / channels;
  }

  for (let f = 0; f < totalFrames; f++) {
    const start = f * samplesPerFrame;
    const end = Math.min(start + samplesPerFrame, mono.length);
    const seg = mono.subarray(start, end);
    const data = new Uint8Array(bins);
    if (seg.length === 0) {
      out[f] = data;
      continue;
    }
    // Distribute energy across bins by splitting the segment into `bins` sub-windows
    const subLen = Math.max(1, Math.floor(seg.length / bins));
    for (let b = 0; b < bins; b++) {
      const sStart = b * subLen;
      const sEnd = Math.min(sStart + subLen, seg.length);
      let sum = 0;
      for (let i = sStart; i < sEnd; i++) sum += seg[i] * seg[i];
      const rms = Math.sqrt(sum / Math.max(1, sEnd - sStart));
      // Apply non-linear curve so visualization "pops" with louder voice
      const v = Math.min(1, Math.pow(rms * 4.5, 0.6));
      data[b] = Math.round(v * 255);
    }
    out[f] = data;
  }
  return out;
}

interface DrawFrameOpts {
  width: number;
  height: number;
  bgImage: HTMLImageElement | null;
  bgVideo?: HTMLVideoElement | null;
  project: StoredProject;
  ayahText: string;
  surahName: string;
  ayahNumber: number;
  reciterName: string;
  progress: number;
  transition: string;
  enterProgress: number; // 0..1 within transition window
  exitProgress: number;
  kenburnsT: number; // 0..1 across full video for Ken Burns slow zoom
}

function drawFrame(ctx: CanvasRenderingContext2D, opts: DrawFrameOpts) {
  const {
    width, height, bgImage, bgVideo, project, ayahText, surahName, ayahNumber, reciterName, progress,
    transition, enterProgress, exitProgress, kenburnsT,
  } = opts;

  // Background — image OR video, with optional Ken Burns slow zoom
  const bgSource: CanvasImageSource | null = bgVideo && bgVideo.videoWidth > 0
    ? bgVideo
    : bgImage;
  const bgW = bgVideo && bgVideo.videoWidth > 0 ? bgVideo.videoWidth : bgImage?.width ?? 0;
  const bgH = bgVideo && bgVideo.videoHeight > 0 ? bgVideo.videoHeight : bgImage?.height ?? 0;

  if (bgSource && bgW > 0 && bgH > 0) {
    // Always paint a base gradient so reduced bg opacity reveals it instead of black
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, `hsl(168, 70%, 18%)`);
    grad.addColorStop(1, `hsl(168, 60%, 8%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const ir = bgW / bgH;
    const cr = width / height;
    let dw = width, dh = height, dx = 0, dy = 0;
    if (ir > cr) {
      dh = height; dw = height * ir; dx = (width - dw) / 2;
    } else {
      dw = width; dh = width / ir; dy = (height - dh) / 2;
    }
    const bgAlpha = Math.max(0, Math.min(1, (project.bgOpacity ?? 100) / 100));
    ctx.save();
    ctx.globalAlpha = bgAlpha;
    if (transition === "kenburns") {
      const zoom = 1 + 0.08 * kenburnsT;
      const newW = dw * zoom;
      const newH = dh * zoom;
      const newX = dx - (newW - dw) / 2;
      const newY = dy - (newH - dh) / 2;
      ctx.drawImage(bgSource, newX, newY, newW, newH);
    } else {
      ctx.drawImage(bgSource, dx, dy, dw, dh);
    }
    ctx.restore();
  } else {
    const shift = Math.sin(progress * Math.PI * 2) * 20;
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, `hsl(${168 + shift}, 70%, 18%)`);
    grad.addColorStop(1, `hsl(${168 + shift}, 60%, 8%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // Dark overlay
  ctx.fillStyle = `rgba(0, 0, 0, ${project.overlayOpacity / 100})`;
  ctx.fillRect(0, 0, width, height);

  // Vignette
  const vg = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.3,
    width / 2, height / 2, Math.max(width, height) * 0.7
  );
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, width, height);

  // === Apply transition transforms to the text layer ===
  const fadeAlpha = Math.min(enterProgress, exitProgress);
  let offsetX = 0;
  let offsetY = 0;
  let scale = 1;
  let blurPx = 0;

  switch (transition) {
    case "slide": {
      const slideIn = (1 - enterProgress) * width * 0.15;
      const slideOut = (1 - exitProgress) * -width * 0.15;
      offsetX = slideIn + slideOut;
      break;
    }
    case "zoom":
      scale = 0.92 + 0.08 * enterProgress;
      break;
    case "blur":
      blurPx = (1 - enterProgress) * 12 + (1 - exitProgress) * 12;
      break;
    case "fade":
    case "kenburns":
    case "none":
    default:
      break;
  }

  ctx.save();
  ctx.globalAlpha = transition === "none" ? 1 : Math.max(0.05, fadeAlpha);
  if (blurPx > 0) (ctx as any).filter = `blur(${blurPx.toFixed(1)}px)`;
  ctx.translate(width / 2 + offsetX, 0);
  ctx.scale(scale, scale);
  ctx.translate(-width / 2, 0);

  let yCenter: number;
  if (project.overlayPosition === "top") yCenter = height * 0.25;
  else if (project.overlayPosition === "bottom") yCenter = height * 0.72;
  else yCenter = height * 0.5;

  // Surah label
  ctx.fillStyle = "rgba(200, 169, 81, 0.95)";
  ctx.font = `${Math.round(width * 0.025)}px "IBM Plex Sans Arabic", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`${surahName} · آية ${ayahNumber}`, width / 2, yCenter - height * 0.22);

  // Quran text
  ctx.fillStyle = project.textColor;
  const fontPx = Math.round((project.fontSize / 48) * width * 0.06);
  ctx.font = `bold ${fontPx}px "Amiri", "Scheherazade New", serif`;
  ctx.textAlign = "center";
  ctx.direction = "rtl";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 16;
  wrapText(ctx, ayahText, width / 2, yCenter, width * 0.85, fontPx * 1.6);
  ctx.shadowBlur = 0;

  ctx.restore();
  if ((ctx as any).filter) (ctx as any).filter = "none";

  // Reciter footer (no transition)
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `${Math.round(width * 0.022)}px "IBM Plex Sans Arabic", sans-serif`;
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.fillText(reciterName, width / 2, height - height * 0.04);

  // Progress bar
  const barW = width * 0.7;
  const barH = Math.max(3, height * 0.005);
  const barX = (width - barW) / 2;
  const barY = height - height * 0.07;
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = "rgba(200, 169, 81, 0.95)";
  ctx.fillRect(barX, barY, barW * progress, barH);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
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

  const maxLines = 6;
  const trimmed = lines.slice(0, maxLines);
  const total = trimmed.length;
  const startY = y - ((total - 1) / 2) * lineHeight;
  trimmed.forEach((line, i) => ctx.fillText(line, x, startY + i * lineHeight));
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

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return url;
}

function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = src;
    const onReady = () => {
      v.removeEventListener("loadeddata", onReady);
      v.removeEventListener("canplaythrough", onReady);
      resolve(v);
    };
    v.addEventListener("loadeddata", onReady, { once: true });
    v.addEventListener("canplaythrough", onReady, { once: true });
    v.addEventListener("error", () => reject(new Error("فشل تحميل فيديو الخلفية")), { once: true });
    try { v.load(); } catch {}
  });
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 1 / 60) {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      video.removeEventListener("seeked", finish);
      resolve();
    };
    video.addEventListener("seeked", finish, { once: true });
    try {
      video.currentTime = time;
    } catch {
      finish();
    }
    setTimeout(finish, 200);
  });
}
