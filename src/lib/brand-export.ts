/**
 * Shared Arabya brand strings/assets for image & video exports.
 * Keep create/studio/mushaf exports consistent: mark + name + site URL.
 */

/** Primary public site on Contabo (.org); .com is an alias. */
export const ARABYA_SITE_HOST = "arabya.org";
export const ARABYA_ALT_SITE_HOST = "arabyaai.com";
export const ARABYA_SITE_URL = "https://www.arabya.org";
export const ARABYA_ALT_SITE_URL = "https://www.arabyaai.com";
export const ARABYA_PUBLIC_HOSTS = [
  "www.arabya.org",
  "www.arabyaai.com",
] as const;
export const ARABYA_BRAND_AR = "عربية";
export const ARABYA_BRAND_EN = "Arabya";
export const ARABYA_MARK_PUBLIC_PATH = "/brand/arabya-mark-square.png";
export const ARABYA_STUDIO_LOCKUP_AR = "عربية ستوديو";
export const ARABYA_STUDIO_LOCKUP_EN = "ARABYA • STUDIO";

export function arabyaBrandName(locale?: string | null): string {
  return locale === "en" ? ARABYA_BRAND_EN : ARABYA_BRAND_AR;
}

/** Draw logo + brand name + site host onto a 2D canvas (bottom area by default). */
export function drawArabyaExportBrand(
  ctx: CanvasRenderingContext2D,
  opts: {
    width: number;
    height: number;
    markImg?: HTMLImageElement | CanvasImageSource | null;
    locale?: string | null;
    /** When true, stronger opacity (free / required watermark). */
    required?: boolean;
    /** Optional title under mark (studio lockup); defaults to brand name. */
    title?: string;
    subtitle?: string;
  },
): void {
  const {
    width,
    height,
    markImg,
    locale,
    required = true,
    title = arabyaBrandName(locale),
    subtitle = ARABYA_SITE_HOST,
  } = opts;

  const pad = Math.round(width * 0.035);
  const mark = Math.max(28, Math.round(width * 0.055));
  const gap = Math.round(mark * 0.22);
  const titleSize = Math.max(12, Math.round(width * 0.028));
  const subSize = Math.max(10, Math.round(width * 0.02));

  ctx.save();
  ctx.font = `bold ${titleSize}px "Reem Kufi", "IBM Plex Sans Arabic", "Cairo", sans-serif`;
  const titleW = Math.ceil(ctx.measureText(title).width);
  ctx.font = `${subSize}px "IBM Plex Sans Arabic", "Cairo", sans-serif`;
  const subW = Math.ceil(ctx.measureText(subtitle).width);
  const textW = Math.max(titleW, subW);
  const boxW = mark + gap + textW;
  const boxH = Math.max(mark, titleSize + subSize + Math.round(height * 0.012));
  const x = width - pad - boxW;
  const y = height - pad - boxH;

  ctx.globalAlpha = required ? 0.96 : 0.9;
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = Math.max(4, width * 0.006);
  ctx.shadowOffsetY = 1;

  const markX = x;
  const markY = y + Math.round((boxH - mark) / 2);
  const radius = mark * 0.22;
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  roundRect(ctx, markX, markY, mark, mark, radius);
  ctx.fill();

  if (markImg) {
    try {
      ctx.drawImage(markImg, markX, markY, mark, mark);
    } catch {
      ctx.fillStyle = "rgba(13,148,136,0.95)";
      ctx.fillRect(markX + 2, markY + 2, mark - 4, mark - 4);
    }
  } else {
    ctx.fillStyle = "rgba(13,148,136,0.95)";
    ctx.fillRect(markX + 2, markY + 2, mark - 4, mark - 4);
  }

  const textX = markX + mark + gap;
  const titleY = y + Math.round(boxH * 0.4);
  const subY = y + Math.round(boxH * 0.78);

  ctx.shadowBlur = Math.max(3, width * 0.004);
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${titleSize}px "Reem Kufi", "IBM Plex Sans Arabic", "Cairo", sans-serif`;
  ctx.textAlign = "left";
  ctx.direction = "ltr";
  if (locale !== "en" && /[\u0600-\u06FF]/.test(title)) {
    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.fillText(title, textX + textW, titleY, textW);
  } else {
    ctx.fillText(title, textX, titleY, textW);
  }

  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(153,246,228,0.95)";
  ctx.font = `${subSize}px "IBM Plex Sans Arabic", "Cairo", sans-serif`;
  ctx.fillText(subtitle, textX, subY, textW);

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
