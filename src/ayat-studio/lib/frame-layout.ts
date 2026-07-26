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

export function frameSurahLabelPx(frameW: number): number {
  return Math.max(10, Math.round(frameW * 0.025));
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
