import type { StoredProject } from "@/ayat-studio/lib/projects-store";

export type ExportPresetId =
  | "reels-720"
  | "reels-1080"
  | "youtube-1080"
  | "youtube-4k"
  | "whatsapp-720"
  | "webm-vp9-1080"
  | "custom";

export type ExportCodec = "h264-mp4" | "vp9-webm";

export type ExportPreset = {
  id: ExportPresetId;
  labelAr: string;
  labelEn: string;
  /** Maps to resolveStudioExportSize quality ladder. */
  quality: StoredProject["quality"];
  videoBitrate: number;
  audioBitrate: number;
  fps: number;
  codec?: ExportCodec;
};

export const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: "reels-720",
    labelAr: "Reels / TikTok — 720p",
    labelEn: "Reels / TikTok — 720p",
    quality: "standard",
    videoBitrate: 4_000_000,
    audioBitrate: 128_000,
    fps: 30,
  },
  {
    id: "reels-1080",
    labelAr: "Reels / Stories — 1080p",
    labelEn: "Reels / Stories — 1080p",
    quality: "high",
    videoBitrate: 8_000_000,
    audioBitrate: 192_000,
    fps: 30,
  },
  {
    id: "youtube-1080",
    labelAr: "YouTube — 1080p",
    labelEn: "YouTube — 1080p",
    quality: "high",
    videoBitrate: 10_000_000,
    audioBitrate: 192_000,
    fps: 30,
  },
  {
    id: "youtube-4k",
    labelAr: "YouTube — 4K",
    labelEn: "YouTube — 4K",
    quality: "ultra",
    videoBitrate: 16_000_000,
    audioBitrate: 256_000,
    fps: 30,
  },
  {
    id: "whatsapp-720",
    labelAr: "WhatsApp — 720p خفيف",
    labelEn: "WhatsApp — light 720p",
    quality: "standard",
    videoBitrate: 2_500_000,
    audioBitrate: 96_000,
    fps: 24,
  },
  {
    id: "webm-vp9-1080",
    labelAr: "WebM VP9 — 1080p",
    labelEn: "WebM VP9 — 1080p",
    quality: "high",
    videoBitrate: 8_000_000,
    audioBitrate: 192_000,
    fps: 30,
    codec: "vp9-webm",
  },
];

export function qualityToExportPresetId(
  quality: StoredProject["quality"] | undefined,
): ExportPresetId {
  if (quality === "standard") return "reels-720";
  if (quality === "ultra") return "youtube-4k";
  return "youtube-1080";
}

export function resolveExportPreset(project: StoredProject): ExportPreset {
  const id =
    project.exportPresetId ??
    qualityToExportPresetId(project.quality);
  if (id === "custom") {
    return {
      id: "custom",
      labelAr: "مخصص (من إعدادات الجودة)",
      labelEn: "Custom (from quality settings)",
      quality: project.quality ?? "high",
      videoBitrate:
        project.quality === "ultra"
          ? 16_000_000
          : project.quality === "standard"
            ? 4_000_000
            : 8_000_000,
      audioBitrate: 192_000,
      fps: 30,
    };
  }
  return (
    EXPORT_PRESETS.find((p) => p.id === id) ??
    EXPORT_PRESETS.find((p) => p.id === "youtube-1080")!
  );
}

export function resolveExportCodec(project: StoredProject): ExportCodec {
  const preset = resolveExportPreset(project);
  return preset.codec ?? project.exportCodec ?? "h264-mp4";
}

export function exportPresetLabel(
  preset: ExportPreset,
  locale: "ar" | "en",
): string {
  return locale === "en" ? preset.labelEn : preset.labelAr;
}
