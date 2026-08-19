import {
  STUDIO_PROGRESS_GOLD,
  STUDIO_TAFSIR_TEXT,
  STUDIO_TRANSLATION_TEXT,
} from "@/lib/studio-default-colors";
import type { StoredProject } from "@/ayat-studio/lib/projects-store";

export type CaptionPresetId =
  | "classic-gold"
  | "minimal-white"
  | "high-contrast"
  | "broadcast"
  | "custom";

export type CaptionPresetPatch = Partial<
  Pick<
    StoredProject,
    | "fontSize"
    | "textColor"
    | "surahLabelTextColor"
    | "translationTextColor"
    | "tafsirTextColor"
    | "overlayOpacity"
    | "softVignette"
    | "progressBarColor"
    | "progressBarStyle"
  >
>;

export type CaptionPreset = {
  id: CaptionPresetId;
  labelAr: string;
  labelEn: string;
  patch: CaptionPresetPatch;
};

export const CAPTION_PRESETS: CaptionPreset[] = [
  {
    id: "classic-gold",
    labelAr: "ذهبي كلاسيكي",
    labelEn: "Classic gold",
    patch: {
      fontSize: 48,
      textColor: "#ffffff",
      surahLabelTextColor: STUDIO_PROGRESS_GOLD,
      translationTextColor: STUDIO_TRANSLATION_TEXT,
      tafsirTextColor: STUDIO_TAFSIR_TEXT,
      overlayOpacity: 40,
      softVignette: true,
      progressBarColor: STUDIO_PROGRESS_GOLD,
      progressBarStyle: "line",
    },
  },
  {
    id: "minimal-white",
    labelAr: "أبيض بسيط",
    labelEn: "Minimal white",
    patch: {
      fontSize: 44,
      textColor: "#ffffff",
      surahLabelTextColor: "#f5f5f5",
      translationTextColor: "#e8e8e8",
      tafsirTextColor: "#d0d0d0",
      overlayOpacity: 28,
      softVignette: false,
      progressBarColor: "#ffffff",
      progressBarStyle: "line",
    },
  },
  {
    id: "high-contrast",
    labelAr: "تباين عالٍ",
    labelEn: "High contrast",
    patch: {
      fontSize: 52,
      textColor: "#fffff0",
      surahLabelTextColor: "#ffd966",
      translationTextColor: "#fff8dc",
      tafsirTextColor: "#f0e6c8",
      overlayOpacity: 55,
      softVignette: true,
      progressBarColor: "#ffd966",
      progressBarStyle: "pill",
    },
  },
  {
    id: "broadcast",
    labelAr: "بث / تلفزيون",
    labelEn: "Broadcast",
    patch: {
      fontSize: 46,
      textColor: "#ffffff",
      surahLabelTextColor: STUDIO_PROGRESS_GOLD,
      translationTextColor: "#fafafa",
      tafsirTextColor: "#ececec",
      overlayOpacity: 48,
      softVignette: true,
      progressBarColor: STUDIO_PROGRESS_GOLD,
      progressBarStyle: "glow",
    },
  },
];

export function captionPresetLabel(
  preset: CaptionPreset,
  locale: "ar" | "en",
): string {
  return locale === "en" ? preset.labelEn : preset.labelAr;
}

export function findCaptionPreset(id: string | undefined): CaptionPreset | null {
  if (!id || id === "custom") return null;
  return CAPTION_PRESETS.find((p) => p.id === id) ?? null;
}
