/**
 * Shared Studio frame metrics — preview and export must use the same formulas
 * so WYSIWYG holds when the preview frame width is measured.
 */

export function frameAyahFontPx(fontSize: number, frameW: number): number {
  return Math.max(12, Math.round((fontSize / 48) * frameW * 0.06));
}

export function frameTranslationFontPx(
  fontSize: number,
  frameW: number,
): number {
  return Math.max(10, Math.round((fontSize / 22) * frameW * 0.028));
}

export function frameTafsirFontPx(fontSize: number, frameW: number): number {
  return Math.max(9, Math.round((fontSize / 18) * frameW * 0.022));
}

/** Logical default for surah/ayah meta label size slider. */
export const DEFAULT_SURAH_LABEL_FONT_SIZE = 16;

export const SURAH_LABEL_FONTS = [
  { id: "IBM Plex Sans Arabic", label: "IBM Plex Sans Arabic" },
  { id: "Reem Kufi", label: "Reem Kufi" },
  { id: "Amiri", label: "Amiri" },
  { id: "Tajawal", label: "Tajawal" },
] as const;

export type SurahLabelFontId = (typeof SURAH_LABEL_FONTS)[number]["id"];

export const DEFAULT_SURAH_LABEL_FONT: SurahLabelFontId =
  "IBM Plex Sans Arabic";
export const DEFAULT_SURAH_LABEL_COLOR = "#C8A951";

/** Brand lockup colors matching the official Arabya Studio mark. */
export const BRAND_LOCKUP_TITLE = "#0A1628";
export const BRAND_LOCKUP_SUB = "#5B6B82";
export const BRAND_LOCKUP_PLATE = "rgba(248, 250, 252, 0.94)";
export const BRAND_LOCKUP_PLATE_BORDER = "rgba(10, 22, 40, 0.08)";

export function frameSurahLabelPx(
  fontSize: number,
  frameW: number,
): number {
  return Math.max(
    10,
    Math.round((fontSize / DEFAULT_SURAH_LABEL_FONT_SIZE) * frameW * 0.025),
  );
}

/** Line height for Quran ayah — room for tashkeel so lines do not collide. */
export function frameAyahLineHeightPx(fontPx: number): number {
  return Math.round(fontPx * 1.95);
}

/** Gap between surah meta label baseline and the top of the ayah block. */
export function frameSurahLabelGapPx(labelPx: number, frameH: number): number {
  return Math.max(Math.round(labelPx * 1.35), Math.round(frameH * 0.032));
}

export function normalizeSurahLabelFont(value: unknown): SurahLabelFontId {
  if (
    typeof value === "string" &&
    SURAH_LABEL_FONTS.some((f) => f.id === value)
  ) {
    return value as SurahLabelFontId;
  }
  return DEFAULT_SURAH_LABEL_FONT;
}

export function frameReciterFontPx(frameW: number): number {
  return Math.max(10, Math.round(frameW * 0.028));
}

/** Brand mark edge length — matches ~preview 22px on a ~300px frame. */
export function frameBrandMarkPx(frameW: number): number {
  return Math.max(22, Math.round(frameW * 0.072));
}

export function frameBrandTitlePx(frameW: number): number {
  return Math.max(11, Math.round(frameW * 0.036));
}

export function frameBrandSubPx(frameW: number): number {
  return Math.max(8, Math.round(frameW * 0.022));
}

export function frameBrandPadPx(frameW: number): number {
  return Math.max(10, Math.round(frameW * 0.028));
}

export type ReciterPosition =
  | "hidden"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export const RECITER_POSITIONS: ReciterPosition[] = [
  "hidden",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

export const RECITER_POSITION_LABELS_AR: Record<ReciterPosition, string> = {
  hidden: "إخفاء اسم القارئ",
  "bottom-left": "أسفل اليسار",
  "bottom-center": "أسفل المنتصف",
  "bottom-right": "أسفل اليمين",
};

export function normalizeReciterPosition(value: unknown): ReciterPosition {
  if (
    typeof value === "string" &&
    (RECITER_POSITIONS as string[]).includes(value)
  ) {
    return value as ReciterPosition;
  }
  return "bottom-left";
}

export type ProgressBarStyle = "none" | "line" | "pill" | "glow" | "dots";

export const PROGRESS_BAR_STYLES: { id: ProgressBarStyle; label: string }[] = [
  { id: "none", label: "بدون شريط" },
  { id: "line", label: "خط رفيع" },
  { id: "pill", label: "شريط مستدير" },
  { id: "glow", label: "توهج ذهبي" },
  { id: "dots", label: "نقاط نبضية" },
];

export function normalizeProgressBarStyle(value: unknown): ProgressBarStyle {
  if (
    typeof value === "string" &&
    PROGRESS_BAR_STYLES.some((s) => s.id === value)
  ) {
    return value as ProgressBarStyle;
  }
  return "none";
}

export function reciterTextAlign(
  position: ReciterPosition,
): CanvasTextAlign {
  if (position === "bottom-left") return "left";
  if (position === "bottom-right") return "right";
  return "center";
}

export function reciterX(position: ReciterPosition, width: number): number {
  const pad = Math.round(width * 0.04);
  if (position === "bottom-left") return pad;
  if (position === "bottom-right") return width - pad;
  return width / 2;
}

export function reciterJustifyClass(position: ReciterPosition): string {
  if (position === "bottom-left") return "justify-start";
  if (position === "bottom-right") return "justify-end";
  return "justify-center";
}
