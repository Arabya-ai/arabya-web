// Real video export with audio using WebCodecs + mp4-muxer (true MP4 output)
import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import type { StoredProject } from "./projects-store";
import { reciters, surahs, aspectRatios } from "./quran-data";
import { fetchAyahs, fetchAndDecodeAudio } from "./quran-api";
import { drawVisualizer, type VisualizerType } from "./visualizer";
import { studioMediaUrl } from "./media-url";

interface ExportOptions {
  project: StoredProject;
  onProgress?: (pct: number, label?: string) => void;
  translationMap?: Record<number, string> | null;
  tafsirMap?: Record<number, string> | null;
  /** Free-plan Arabya mark (top-right, semi-transparent). */
  watermark?: boolean;
}

export async function exportProjectToVideo({
  project,
  onProgress,
  translationMap = null,
  tafsirMap = null,
  watermark = false,
}: ExportOptions): Promise<Blob> {
  if (typeof VideoEncoder === "undefined" || typeof AudioEncoder === "undefined") {
    throw new Error("متصفحك لا يدعم تصدير MP4. الرجاء استخدام Chrome أو Edge الحديث.");
  }

  const ratio = aspectRatios.find((r) => r.id === project.ratio) || aspectRatios[0];
  let scale = project.quality === "standard" ? 0.5 : project.quality === "ultra" ? 1.5 : 1;
  let width = Math.round((ratio.width * scale) / 2) * 2;
  let height = Math.round((ratio.height * scale) / 2) * 2;

  onProgress?.(0, "جلب الآيات والصوت...");

  const ayahs = await fetchAyahs(project.surahId, project.ayahStart, project.ayahEnd, project.reciterId);
  if (ayahs.length === 0) throw new Error("لم يتم العثور على آيات");

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const { buffer: rawAudio, segments: rawSegments } = await fetchAndDecodeAudio(
    ayahs,
    audioCtx,
    {
      pauseBetweenAyahsMs: project.pauseBetweenAyahsMs ?? 0,
      softNormalize: project.softNormalize ?? true,
    },
  );
  const rate = Math.max(0.75, Math.min(1.25, project.playbackRate ?? 1));
  const audioBuffer =
    rate === 1 ? rawAudio : await resampleBuffer(audioCtx, rawAudio, rate);
  const segments =
    rate === 1
      ? rawSegments
      : rawSegments.map((s) => ({
          ...s,
          start: s.start / rate,
          end: s.end / rate,
        }));
  const audioSampleRate = audioBuffer.sampleRate;
  const totalDuration = audioBuffer.duration;
  onProgress?.(8, "تحضير الخلفية...");

  const revokes: Array<() => void> = [];
  const cleanupMedia = () => {
    for (const r of revokes) {
      try {
        r();
      } catch {
        /* ignore */
      }
    }
  };

  let watermarkImg: HTMLImageElement | null = null;
  if (watermark) {
    try {
      const loaded = await loadImageBuffered("/brand/arabya-mark-square.png");
      revokes.push(loaded.revoke);
      watermarkImg = loaded.image;
    } catch {
      /* text fallback in drawFrame */
    }
  }

  const isVideoBg =
    (project.bgType === "image" || project.bgType === "url") &&
    project.bgKind === "video" &&
    !!project.bgUrl;
  let bgImage: HTMLImageElement | null = null;
  let bgVideo: HTMLVideoElement | null = null;
  let bgVideoDuration = 0;

  try {
    if (isVideoBg) {
      const loaded = await loadVideoBuffered(studioMediaUrl(project.bgUrl));
      revokes.push(loaded.revoke);
      bgVideo = loaded.video;
      bgVideoDuration = loaded.duration;
    } else if ((project.bgType === "image" || project.bgType === "url") && project.bgUrl) {
      if (
        project.bgUrl.startsWith("http") &&
        !studioMediaUrl(project.bgUrl).startsWith("/") &&
        !project.bgUrl.startsWith("data:")
      ) {
        throw new Error(
          "رابط الخلفية غير مدعوم للتصدير. استخدم بحث Pexels أو ارفع ملفًا من جهازك.",
        );
      }
      const loaded = await loadImageBuffered(studioMediaUrl(project.bgUrl));
      revokes.push(loaded.revoke);
      bgImage = loaded.image;
    }

    const surah = surahs.find((s) => s.id === project.surahId);
    const reciter = reciters.find((r) => r.id === project.reciterId);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false })!;

    const fps = 30;
    const totalFrames = Math.ceil(totalDuration * fps);
    onProgress?.(12, "تحليل الصوت...");
    const freqPerFrame = await computeFreqPerFrame(audioBuffer, totalFrames, fps);

    let encoderError: Error | null = null;
    const failEncode = (e: unknown) => {
      encoderError =
        e instanceof Error ? e : new Error(String(e || "encode_failed"));
    };

    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: "avc", width, height, frameRate: fps },
      audio: { codec: "aac", numberOfChannels: 2, sampleRate: audioSampleRate },
      fastStart: "in-memory",
    });

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: failEncode,
    });

    const codedArea = width * height;
    let avcCodec = "avc1.4d0028";
    if (codedArea > 9_437_184) avcCodec = "avc1.640034";
    else if (codedArea > 5_652_480) avcCodec = "avc1.640033";
    else if (codedArea > 2_228_224) avcCodec = "avc1.640032";
    else if (codedArea > 2_097_152) avcCodec = "avc1.64002a";

    let videoConfig: VideoEncoderConfig = {
      codec: avcCodec,
      width,
      height,
      bitrate:
        project.quality === "ultra"
          ? 16_000_000
          : project.quality === "standard"
            ? 4_000_000
            : 8_000_000,
      framerate: fps,
      avc: { format: "avc" },
    };

    if (typeof VideoEncoder.isConfigSupported === "function") {
      let support = await VideoEncoder.isConfigSupported(videoConfig);
      if (!support.supported && scale > 1) {
        scale = 1;
        width = Math.round((ratio.width * scale) / 2) * 2;
        height = Math.round((ratio.height * scale) / 2) * 2;
        canvas.width = width;
        canvas.height = height;
        videoConfig = { ...videoConfig, width, height, bitrate: 5_000_000 };
        support = await VideoEncoder.isConfigSupported(videoConfig);
        onProgress?.(14, "تم خفض الجودة إلى 1080p لدعم الجهاز...");
      }
      if (!support.supported) {
        throw new Error("جهازك لا يدعم ترميز هذا المقاس. جرّب جودة عادية (720p).");
      }
    }

    videoEncoder.configure(videoConfig);

    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: failEncode,
    });
    audioEncoder.configure({
      codec: "mp4a.40.2",
      numberOfChannels: 2,
      sampleRate: audioSampleRate,
      bitrate: 192_000,
    });

    onProgress?.(15, "ترميز الفيديو والصوت...");

    const totalSamples = audioBuffer.length;
    const audioChunkSize = Math.floor(audioSampleRate * 0.1);
    const ch0 = audioBuffer.getChannelData(0);
    const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;
    const volume = Math.max(0, Math.min(1, (project.volume ?? 80) / 100));
    const fadeInSec = project.fadeIn ? Math.min(1.2, totalDuration / 6) : 0;
    const fadeOutSec = project.fadeOut ? Math.min(1.5, totalDuration / 6) : 0;

    const sampleGain = (sampleIndex: number) => {
      const t = sampleIndex / audioSampleRate;
      let g = volume;
      if (fadeInSec > 0 && t < fadeInSec) g *= t / fadeInSec;
      if (fadeOutSec > 0 && t > totalDuration - fadeOutSec) {
        g *= Math.max(0, (totalDuration - t) / fadeOutSec);
      }
      return g;
    };

    const waitForVideoEncoderCapacity = async (maxQueueSize = 4) => {
      while (videoEncoder.encodeQueueSize >= maxQueueSize) {
        if (encoderError) throw encoderError;
        await new Promise((r) => setTimeout(r, 0));
      }
    };

    const audioPromise = (async () => {
      for (let i = 0; i < totalSamples; i += audioChunkSize) {
        if (encoderError) throw encoderError;
        const len = Math.min(audioChunkSize, totalSamples - i);
        const interleaved = new Float32Array(len * 2);
        for (let j = 0; j < len; j++) {
          const g = sampleGain(i + j);
          interleaved[j * 2] = ch0[i + j] * g;
          interleaved[j * 2 + 1] = ch1[i + j] * g;
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
      if (encoderError) throw encoderError;
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
        translationText: project.translationEnabled
          ? resolveExportLayer(
              translationMap,
              project.translationOverrides,
              project.surahId,
              currentSegment.numberInSurah,
            )
          : "",
        tafsirText: project.tafsirEnabled
          ? resolveExportLayer(
              tafsirMap,
              project.tafsirOverrides,
              project.surahId,
              currentSegment.numberInSurah,
            )
          : "",
        surahName: surah?.name || "",
        ayahNumber: currentSegment.numberInSurah,
        reciterName: reciter?.name || "",
        progress: timeSec / totalDuration,
        transition,
        enterProgress,
        exitProgress,
        kenburnsT: timeSec / totalDuration,
        watermarkImg,
        showWatermark: watermark,
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
    if (encoderError) throw encoderError;

    onProgress?.(92, "إنهاء ترميز الصوت...");
    await audioPromise;
    if (encoderError) throw encoderError;

    onProgress?.(95, "إنهاء الملف...");
    muxer.finalize();
    const target = muxer.target as ArrayBufferTarget;
    const mp4Blob = new Blob([target.buffer], { type: "video/mp4" });

    await audioCtx.close().catch(() => {});
    onProgress?.(100, "اكتمل");
    return mp4Blob;
  } finally {
    cleanupMedia();
  }
}

/** One-frame PNG matching studio preview (ayah + background). */
export async function exportProjectToPng(
  project: StoredProject,
  layers?: {
    translationMap?: Record<number, string> | null;
    tafsirMap?: Record<number, string> | null;
    watermark?: boolean;
  },
): Promise<Blob> {
  const translationMap = layers?.translationMap ?? null;
  const tafsirMap = layers?.tafsirMap ?? null;
  const watermark = layers?.watermark ?? false;
  const ratio = aspectRatios.find((r) => r.id === project.ratio) || aspectRatios[0];
  const width = ratio.width;
  const height = ratio.height;
  const ayahs = await fetchAyahs(
    project.surahId,
    project.ayahStart,
    project.ayahStart,
    project.reciterId,
  );
  if (ayahs.length === 0) throw new Error("لم يتم العثور على الآية");

  const revokes: Array<() => void> = [];
  try {
    let bgImage: HTMLImageElement | null = null;
    let bgVideo: HTMLVideoElement | null = null;
    let watermarkImg: HTMLImageElement | null = null;
    const isVideoBg =
      (project.bgType === "image" || project.bgType === "url") &&
      project.bgKind === "video" &&
      !!project.bgUrl;

    if (watermark) {
      try {
        const loaded = await loadImageBuffered("/brand/arabya-mark-square.png");
        revokes.push(loaded.revoke);
        watermarkImg = loaded.image;
      } catch {
        /* fallback text */
      }
    }

    if (isVideoBg) {
      const loaded = await loadVideoBuffered(studioMediaUrl(project.bgUrl));
      revokes.push(loaded.revoke);
      bgVideo = loaded.video;
      await seekVideo(bgVideo, Math.min(0.2, loaded.duration * 0.1));
    } else if ((project.bgType === "image" || project.bgType === "url") && project.bgUrl) {
      if (
        project.bgUrl.startsWith("http") &&
        !studioMediaUrl(project.bgUrl).startsWith("/") &&
        !project.bgUrl.startsWith("data:")
      ) {
        throw new Error(
          "رابط الخلفية غير مدعوم. استخدم بحث Pexels أو ارفع ملفًا من جهازك.",
        );
      }
      const loaded = await loadImageBuffered(studioMediaUrl(project.bgUrl));
      revokes.push(loaded.revoke);
      bgImage = loaded.image;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const surah = surahs.find((s) => s.id === project.surahId);
    const reciter = reciters.find((r) => r.id === project.reciterId);
    const ayah = ayahs[0];

    drawFrame(ctx, {
      width,
      height,
      bgImage,
      bgVideo,
      project,
      ayahText: ayah.text,
      translationText: project.translationEnabled
        ? resolveExportLayer(
            translationMap,
            project.translationOverrides,
            project.surahId,
            ayah.numberInSurah,
          )
        : "",
      tafsirText: project.tafsirEnabled
        ? resolveExportLayer(
            tafsirMap,
            project.tafsirOverrides,
            project.surahId,
            ayah.numberInSurah,
          )
        : "",
      surahName: surah?.name || "",
      ayahNumber: ayah.numberInSurah,
      reciterName: reciter?.name || "",
      progress: 0.15,
      transition: "none",
      enterProgress: 1,
      exitProgress: 1,
      kenburnsT: 0,
      watermarkImg,
      showWatermark: watermark,
    });

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("فشل إنشاء الصورة"))),
        "image/png",
      );
    });
  } finally {
    for (const r of revokes) {
      try {
        r();
      } catch {
        /* ignore */
      }
    }
  }
}

function resolveExportLayer(
  map: Record<number, string> | null | undefined,
  overrides: Record<string, string> | undefined,
  surahId: number,
  ayah: number,
): string {
  const key = `${surahId}:${ayah}`;
  if (overrides?.[key]) return overrides[key];
  return map?.[ayah] || "";
}

async function resampleBuffer(
  ctx: AudioContext,
  buffer: AudioBuffer,
  rate: number,
): Promise<AudioBuffer> {
  const offline = new OfflineAudioContext(
    buffer.numberOfChannels,
    Math.ceil(buffer.length / rate),
    buffer.sampleRate,
  );
  const src = offline.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  src.connect(offline.destination);
  src.start(0);
  return offline.startRendering();
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
  translationText?: string;
  tafsirText?: string;
  surahName: string;
  ayahNumber: number;
  reciterName: string;
  progress: number;
  transition: string;
  enterProgress: number;
  exitProgress: number;
  kenburnsT: number;
  watermarkImg?: HTMLImageElement | null;
  showWatermark?: boolean;
}

function drawFrame(ctx: CanvasRenderingContext2D, opts: DrawFrameOpts) {
  const {
    width,
    height,
    bgImage,
    bgVideo,
    project,
    ayahText,
    translationText = "",
    tafsirText = "",
    surahName,
    ayahNumber,
    reciterName,
    progress,
    transition,
    enterProgress,
    exitProgress,
    kenburnsT,
    watermarkImg = null,
    showWatermark = false,
  } = opts;

  const bgSource: CanvasImageSource | null =
    bgVideo && bgVideo.videoWidth > 0 ? bgVideo : bgImage;
  const bgW =
    bgVideo && bgVideo.videoWidth > 0
      ? bgVideo.videoWidth
      : (bgImage?.width ?? 0);
  const bgH =
    bgVideo && bgVideo.videoHeight > 0
      ? bgVideo.videoHeight
      : (bgImage?.height ?? 0);

  if (bgSource && bgW > 0 && bgH > 0) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, `hsl(168, 70%, 18%)`);
    grad.addColorStop(1, `hsl(168, 60%, 8%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const ir = bgW / bgH;
    const cr = width / height;
    let dw = width,
      dh = height,
      dx = 0,
      dy = 0;
    if (ir > cr) {
      dh = height;
      dw = height * ir;
      dx = (width - dw) / 2;
    } else {
      dw = width;
      dh = width / ir;
      dy = (height - dh) / 2;
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

  ctx.fillStyle = `rgba(0, 0, 0, ${project.overlayOpacity / 100})`;
  ctx.fillRect(0, 0, width, height);

  if (project.softVignette !== false) {
    const vg = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.3,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.7,
    );
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, width, height);
  }

  const fadeAlpha = Math.min(enterProgress, exitProgress);
  let offsetX = 0;
  let offsetY = 0;
  let scale = 1;
  let blurPx = 0;
  let glow = 0;

  switch (transition) {
    case "slide": {
      offsetX =
        (1 - enterProgress) * width * 0.15 + (1 - exitProgress) * -width * 0.15;
      break;
    }
    case "zoom":
      scale = 0.92 + 0.08 * enterProgress;
      break;
    case "blur":
      blurPx = (1 - enterProgress) * 12 + (1 - exitProgress) * 12;
      break;
    case "wipe":
      offsetX = (1 - enterProgress) * width * 0.35;
      break;
    case "rise":
      offsetY = (1 - enterProgress) * height * 0.08;
      break;
    case "glow":
      glow = (1 - fadeAlpha) * 28;
      break;
    default:
      break;
  }

  ctx.save();
  ctx.globalAlpha = transition === "none" ? 1 : Math.max(0.05, fadeAlpha);
  if (blurPx > 0) (ctx as any).filter = `blur(${blurPx.toFixed(1)}px)`;
  ctx.translate(width / 2 + offsetX, offsetY);
  ctx.scale(scale, scale);
  ctx.translate(-width / 2, 0);

  let yCenter: number;
  if (project.overlayPosition === "top") yCenter = height * 0.22;
  else if (project.overlayPosition === "bottom") yCenter = height * 0.62;
  else yCenter = height * 0.42;

  const showNumbers = project.previewShowAyahNumbers !== false;
  const ayahOnly = project.previewShowAyahOnly === true;

  if (!ayahOnly) {
    ctx.fillStyle = "rgba(200, 169, 81, 0.95)";
    ctx.font = `${Math.round(width * 0.025)}px "IBM Plex Sans Arabic", sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(
      showNumbers ? `${surahName} · آية ${ayahNumber}` : surahName,
      width / 2,
      yCenter - height * 0.16,
    );
  }

  ctx.fillStyle = project.textColor;
  const fontPx = Math.round((project.fontSize / 48) * width * 0.06);
  ctx.font = `bold ${fontPx}px "Amiri", "Scheherazade New", serif`;
  ctx.textAlign = "center";
  ctx.direction = "rtl";
  ctx.shadowColor = glow
    ? "rgba(200,169,81,0.9)"
    : "rgba(0,0,0,0.8)";
  ctx.shadowBlur = glow || 16;
  wrapText(ctx, ayahText, width / 2, yCenter, width * 0.85, fontPx * 1.55);
  ctx.shadowBlur = 0;

  let nextY = yCenter + fontPx * 1.8;
  if (translationText) {
    const tSize = Math.round(
      ((project.translationFontSize ?? 22) / 22) * width * 0.028,
    );
    ctx.fillStyle = project.translationTextColor || "#f0e6d0";
    ctx.font = `${tSize}px "IBM Plex Sans Arabic", sans-serif`;
    ctx.direction = "auto" as CanvasDirection;
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 10;
    const used = wrapTextLines(
      ctx,
      translationText,
      width / 2,
      nextY,
      width * 0.82,
      tSize * 1.45,
      4,
    );
    nextY += used * tSize * 1.45 + tSize * 0.4;
    ctx.shadowBlur = 0;
  }

  if (tafsirText) {
    const tSize = Math.round(
      ((project.tafsirFontSize ?? 18) / 18) * width * 0.022,
    );
    const clipped =
      tafsirText.length > 360 ? `${tafsirText.slice(0, 360)}…` : tafsirText;
    ctx.fillStyle = project.tafsirTextColor || "#d4c4a8";
    ctx.font = `${tSize}px "IBM Plex Sans Arabic", sans-serif`;
    ctx.direction = "auto" as CanvasDirection;
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 8;
    wrapTextLines(
      ctx,
      clipped,
      width / 2,
      nextY,
      width * 0.82,
      tSize * 1.4,
      5,
    );
    ctx.shadowBlur = 0;
  }

  ctx.restore();
  if ((ctx as any).filter) (ctx as any).filter = "none";

  if (!ayahOnly) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = `${Math.round(width * 0.022)}px "IBM Plex Sans Arabic", sans-serif`;
    ctx.direction = "rtl";
    ctx.textAlign = "center";
    ctx.fillText(reciterName, width / 2, height - height * 0.04);
  }

  if (project.brandSignature !== false) {
    ctx.strokeStyle = "rgba(200,169,81,0.4)";
    ctx.lineWidth = Math.max(2, width * 0.003);
    const pad = Math.round(width * 0.02);
    ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);
    ctx.fillStyle = "rgba(200,169,81,0.55)";
    ctx.font = `${Math.round(width * 0.018)}px "IBM Plex Sans Arabic", sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText("عربية", pad * 1.4, height - pad * 1.6);
  }

  const barW = width * 0.7;
  const barH = Math.max(3, height * 0.005);
  const barX = (width - barW) / 2;
  const barY = height - height * 0.07;
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = "rgba(200, 169, 81, 0.95)";
  ctx.fillRect(barX, barY, barW * progress, barH);

  if (showWatermark) {
    const mark = Math.max(28, Math.round(width * 0.055));
    const pad = Math.round(width * 0.03);
    ctx.save();
    ctx.globalAlpha = 0.42;
    if (watermarkImg && watermarkImg.width > 0) {
      ctx.drawImage(watermarkImg, width - pad - mark, pad, mark, mark);
    } else {
      ctx.fillStyle = "rgba(200,169,81,0.9)";
      ctx.font = `bold ${Math.round(mark * 0.45)}px "IBM Plex Sans Arabic", sans-serif`;
      ctx.textAlign = "right";
      ctx.fillText("عربية", width - pad, pad + mark * 0.65);
    }
    ctx.restore();
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  wrapTextLines(ctx, text, x, y, maxWidth, lineHeight, 6);
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): number {
  const words = text.split(/\s+/).filter(Boolean);
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
  const trimmed = lines.slice(0, maxLines);
  const total = trimmed.length;
  const startY = y - ((total - 1) / 2) * lineHeight;
  trimmed.forEach((line, i) => ctx.fillText(line, x, startY + i * lineHeight));
  return total;
}

function shouldUseCorsAnonymous(src: string): boolean {
  if (!src || src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("/")) {
    return false;
  }
  try {
    if (typeof window === "undefined") return true;
    return new URL(src, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

async function fetchAsObjectUrl(src: string): Promise<{ url: string; revoke: () => void }> {
  if (src.startsWith("data:") || src.startsWith("blob:")) {
    return { url: src, revoke: () => undefined };
  }
  const res = await fetch(src, {
    credentials: src.startsWith("/") ? "same-origin" : "omit",
  });
  if (!res.ok) {
    throw new Error(`فشل جلب الوسائط (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  return { url, revoke: () => URL.revokeObjectURL(url) };
}

async function loadImageBuffered(
  src: string,
): Promise<{ image: HTMLImageElement; revoke: () => void }> {
  const { url, revoke } = await fetchAsObjectUrl(src);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      if (shouldUseCorsAnonymous(url)) img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("فشل تحميل صورة الخلفية"));
      img.src = url;
    });
    return { image, revoke };
  } catch (e) {
    revoke();
    throw e;
  }
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

async function loadVideoBuffered(
  src: string,
): Promise<{ video: HTMLVideoElement; duration: number; revoke: () => void }> {
  const { url, revoke } = await fetchAsObjectUrl(src);
  try {
    const video = await new Promise<HTMLVideoElement>((resolve, reject) => {
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      let settled = false;
      const succeed = () => {
        if (settled) return;
        if (!(isFinite(v.duration) && v.duration > 0)) return;
        settled = true;
        resolve(v);
      };
      const fail = () => {
        if (settled) return;
        settled = true;
        reject(new Error("فشل تحميل فيديو الخلفية"));
      };
      v.addEventListener("loadedmetadata", succeed);
      v.addEventListener("durationchange", succeed);
      v.addEventListener("error", fail, { once: true });
      v.src = url;
      try {
        v.load();
      } catch {
        fail();
      }
      setTimeout(() => {
        if (!settled && isFinite(v.duration) && v.duration > 0) succeed();
        else if (!settled) fail();
      }, 20000);
    });
    return { video, duration: video.duration, revoke };
  } catch (e) {
    revoke();
    throw e;
  }
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const target = Math.max(0, Math.min(time, (video.duration || time) - 0.001));
    if (Math.abs(video.currentTime - target) < 1 / 45) {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      video.removeEventListener("seeked", finish);
      video.removeEventListener("error", onErr);
      resolve();
    };
    const onErr = () => {
      if (done) return;
      done = true;
      reject(new Error("فشل تحريك إطار فيديو الخلفية"));
    };
    video.addEventListener("seeked", finish, { once: true });
    video.addEventListener("error", onErr, { once: true });
    try {
      video.currentTime = target;
    } catch {
      finish();
    }
    setTimeout(() => {
      if (!done && Math.abs(video.currentTime - target) < 0.25) finish();
      else if (!done) finish(); // soft-continue rather than freeze export
    }, 800);
  });
}
