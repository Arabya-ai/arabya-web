/**
 * Shared Studio frame metrics — preview and export must use the same formulas
 * so WYSIWYG holds when the preview frame width is measured.
 */

/** Default frame gradient when no background media is set (preview + export). */
export const STUDIO_FRAME_GRADIENT_CSS =
  "linear-gradient(180deg, hsl(168 70% 18%) 0%, hsl(168 60% 8%) 100%)";

/** Tafsir clip length — preview must match export canvas. */
export const STUDIO_TAFSIR_PREVIEW_MAX_CHARS = 360;

/** Live preview max height as a fraction of viewport (editor shell is locked). */
export const STUDIO_PREVIEW_VIEWPORT_HEIGHT_RATIO = 0.68;

export type OverlayPosition = "top" | "center" | "bottom";

/** Vertical anchor for ayah block — same ratios as video-export drawFrame. */
export function frameOverlayYCenter(
  position: OverlayPosition | string | undefined,
  frameH: number,
): number {
  if (position === "top") return frameH * 0.22;
  if (position === "bottom") return frameH * 0.62;
  return frameH * 0.42;
}

/** Gold border inset around the frame (preview + export). */
export function frameBrandBorderInsetPx(frameW: number): number {
  return Math.max(2, Math.round(frameW * 0.02));
}

/** Brand lockup stack height — deterministic from frame width (preview = export). */
export function frameBrandLockupBoxH(frameW: number): number {
  const mark = frameBrandMarkPx(frameW);
  const titleSize = frameBrandTitlePx(frameW);
  const subSize = frameBrandSubPx(frameW);
  const urlSize = Math.max(10, Math.round(subSize * 0.92));
  return Math.max(mark, titleSize + subSize + urlSize + 14);
}

/** Approximate brand lockup width when canvas measureText is unavailable (preview). */
export function estimateBrandLockupBoxW(frameW: number): number {
  const mark = frameBrandMarkPx(frameW);
  const gap = Math.round(mark * 0.22);
  const subSize = frameBrandSubPx(frameW);
  const urlSize = Math.max(10, Math.round(subSize * 0.92));
  const textW = Math.ceil(
    Math.max(
      BRAND_LOCKUP_EN.length * subSize * 0.62,
      BRAND_SITE_HOST.length * urlSize * 0.56,
    ),
  );
  return mark + gap + textW;
}

type BottomLane = "left" | "center" | "right";

function bottomLane(pos: string): BottomLane | null {
  if (!pos.startsWith("bottom-")) return null;
  if (pos.endsWith("left")) return "left";
  if (pos.endsWith("right")) return "right";
  return "center";
}

/**
 * True when brand lockup and reciter name would occupy the same bottom zone
 * (same corner, or either is centered on the bottom edge).
 */
export function brandAndReciterCollide(
  brandPosition: string,
  reciterPosition: ReciterPosition | string,
  showBrand: boolean,
): boolean {
  if (!showBrand || reciterPosition === "hidden") return false;
  const brandLane = bottomLane(brandPosition);
  const reciterLane = bottomLane(String(reciterPosition));
  if (!brandLane || !reciterLane) return false;
  return (
    brandLane === reciterLane ||
    brandLane === "center" ||
    reciterLane === "center"
  );
}

/**
 * Distance from frame bottom to reciter baseline (canvas) / CSS `bottom`.
 * When brand occupies the same bottom zone, lift the name above the lockup
 * so preview and export stay readable and match.
 */
export function frameReciterBottomPx(
  frameH: number,
  opts?: {
    collideWithBrand?: boolean;
    brandBoxH?: number;
    brandPad?: number;
  },
): number {
  const base = Math.round(frameH * 0.035);
  if (!opts?.collideWithBrand) return base;
  const pad = opts.brandPad ?? base;
  const boxH = opts.brandBoxH ?? 0;
  const gap = Math.max(6, Math.round(frameH * 0.012));
  return Math.max(base, pad + boxH + gap);
}

/** Export-style progress bar vertical position from top. */
export function frameProgressBarTopPx(frameH: number): number {
  return frameH - frameH * 0.07;
}

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

export const BRAND_LOCKUP_AR = "عربية ستوديو";
export const BRAND_LOCKUP_EN = "ARABYA • STUDIO";
export const BRAND_SITE_HOST = "arabyaai.com";

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
