import { readFile } from "node:fs/promises";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import {
  ARABYA_MARK_PUBLIC_PATH,
  ARABYA_SITE_HOST,
  arabyaBrandName,
} from "@/lib/brand-export";
import {
  imageSizeForAspect,
  type ImageAspect,
} from "@/lib/plans";

let arabicFontDataUri: string | null = null;
let brandMarkDataUri: string | null = null;

async function arabicFontUri(): Promise<string> {
  if (arabicFontDataUri) return arabicFontDataUri;
  const buf = await readFile(
    path.join(process.cwd(), "public/fonts/NotoNaskhArabic-Regular.ttf"),
  );
  arabicFontDataUri = `data:font/ttf;base64,${buf.toString("base64")}`;
  return arabicFontDataUri;
}

async function brandMarkUri(): Promise<string | null> {
  if (brandMarkDataUri) return brandMarkDataUri;
  try {
    const buf = await readFile(
      path.join(process.cwd(), "public", ARABYA_MARK_PUBLIC_PATH.replace(/^\//, "")),
    );
    brandMarkDataUri = `data:image/png;base64,${buf.toString("base64")}`;
    return brandMarkDataUri;
  } catch {
    return null;
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapLines(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 8);
}

export type CreateAyahImageOpts = {
  aspect: ImageAspect;
  surahTitle: string;
  verseLabel: string;
  ayahText: string;
  translation?: string;
  watermark: boolean;
  /** Hex background override (Plus); default teal gradient */
  backgroundColor?: string;
  locale?: string;
};

/**
 * Shareable ayah PNG (inspired by rukn / PNG exporters; uses local QPC text + resvg).
 * Always includes Arabya mark + brand name + arabyaai.com (stronger when watermark).
 */
export async function renderCreateAyahPng(
  opts: CreateAyahImageOpts,
): Promise<Buffer> {
  const { width, height } = imageSizeForAspect(opts.aspect);
  const fontUri = await arabicFontUri();
  const markUri = await brandMarkUri();
  const brand = arabyaBrandName(opts.locale);
  const title = `${opts.surahTitle} · ${opts.verseLabel}`;
  const ayahLines = wrapLines(opts.ayahText, opts.aspect === "16:9" ? 48 : 28);
  const trLines = opts.translation
    ? wrapLines(opts.translation, opts.aspect === "16:9" ? 56 : 36)
    : [];

  const padX = Math.round(width * 0.07);
  const centerY = Math.round(height * 0.42);
  const lineH = Math.round(width * 0.045);
  const fontSize = Math.round(width * 0.042);
  const titleSize = Math.round(width * 0.028);

  const ayahSvg = ayahLines
    .map((line, i) => {
      const y = centerY + i * lineH;
      return `<text x="${width - padX}" y="${y}" text-anchor="end" direction="rtl" xml:lang="ar" fill="#f8fafc" font-size="${fontSize}">${escapeXml(line)}</text>`;
    })
    .join("\n");

  const trStart = centerY + ayahLines.length * lineH + Math.round(height * 0.04);
  const trSvg = trLines
    .map((line, i) => {
      return `<text x="${width / 2}" y="${trStart + i * Math.round(lineH * 0.85)}" text-anchor="middle" fill="#cbd5e1" font-size="${Math.round(fontSize * 0.55)}" opacity="0.92">${escapeXml(line)}</text>`;
    })
    .join("\n");

  const bg =
    opts.backgroundColor && /^#[0-9a-fA-F]{6}$/.test(opts.backgroundColor)
      ? `<rect width="100%" height="100%" fill="${opts.backgroundColor}"/>`
      : `<defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f766e"/>
      <stop offset="55%" stop-color="#134e4a"/>
      <stop offset="100%" stop-color="#0b1412"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>`;

  const mark = Math.max(36, Math.round(width * 0.06));
  const brandPad = Math.round(width * 0.04);
  const brandOpacity = opts.watermark ? 0.92 : 0.88;
  const nameSize = Math.round(width * 0.028);
  const urlSize = Math.round(width * 0.02);
  const brandBlockX = brandPad;
  const brandBlockY = height - brandPad - mark;
  const textX = brandBlockX + mark + Math.round(mark * 0.28);
  const nameY = brandBlockY + Math.round(mark * 0.42);
  const urlY = brandBlockY + Math.round(mark * 0.82);

  const markSvg = markUri
    ? `<rect x="${brandBlockX}" y="${brandBlockY}" width="${mark}" height="${mark}" rx="${Math.round(mark * 0.22)}" fill="rgba(255,255,255,0.94)"/>
  <image href="${markUri}" xlink:href="${markUri}" x="${brandBlockX}" y="${brandBlockY}" width="${mark}" height="${mark}" preserveAspectRatio="xMidYMid meet"/>`
    : `<rect x="${brandBlockX}" y="${brandBlockY}" width="${mark}" height="${mark}" rx="${Math.round(mark * 0.22)}" fill="#0d9488"/>`;

  const brandLockup = `<g opacity="${brandOpacity}">
  ${markSvg}
  <text x="${textX}" y="${nameY}" text-anchor="start" fill="#f8fafc" font-size="${nameSize}" font-weight="700" font-family="Noto Naskh Arabic, NotoNaskh, sans-serif">${escapeXml(brand)}</text>
  <text x="${textX}" y="${urlY}" text-anchor="start" fill="#99f6e4" font-size="${urlSize}" font-family="DejaVu Sans, sans-serif">${escapeXml(ARABYA_SITE_HOST)}</text>
</g>`;

  // Free plan: extra centered soft watermark word for visibility on busy backgrounds.
  const centerWatermark = opts.watermark
    ? `<text x="${width / 2}" y="${Math.round(height * 0.52)}" text-anchor="middle" fill="#99f6e4" font-size="${Math.round(width * 0.09)}" opacity="0.12" font-family="Noto Naskh Arabic, NotoNaskh, sans-serif">${escapeXml(brand)}</text>`
    : "";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style type="text/css"><![CDATA[
      @font-face { font-family: 'NotoNaskh'; src: url('${fontUri}'); }
      text { font-family: 'NotoNaskh', 'Noto Naskh Arabic', sans-serif; }
    ]]></style>
  </defs>
  ${bg}
  <text x="${width - padX}" y="${Math.round(height * 0.08)}" text-anchor="end" direction="rtl" fill="#99f6e4" font-size="${titleSize}" opacity="0.95">${escapeXml(title)}</text>
  ${centerWatermark}
  ${ayahSvg}
  ${trSvg}
  ${brandLockup}
</svg>`;

  const arabicFontFile = path.join(
    process.cwd(),
    "public/fonts/NotoNaskhArabic-Regular.ttf",
  );
  const latinFontFile = path.join(process.cwd(), "public/fonts/DejaVuSans.ttf");
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: {
      loadSystemFonts: false,
      fontFiles: [arabicFontFile, latinFontFile],
      defaultFontFamily: "Noto Naskh Arabic",
    },
  });
  return Buffer.from(resvg.render().asPng());
}
