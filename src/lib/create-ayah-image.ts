import { readFile } from "node:fs/promises";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import {
  imageSizeForAspect,
  type ImageAspect,
} from "@/lib/plans";

let arabicFontDataUri: string | null = null;

async function arabicFontUri(): Promise<string> {
  if (arabicFontDataUri) return arabicFontDataUri;
  const buf = await readFile(
    path.join(process.cwd(), "public/fonts/NotoNaskhArabic-Regular.ttf"),
  );
  arabicFontDataUri = `data:font/ttf;base64,${buf.toString("base64")}`;
  return arabicFontDataUri;
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
 * Separate from social OG cards so existing /api/og stays unchanged.
 */
export async function renderCreateAyahPng(
  opts: CreateAyahImageOpts,
): Promise<Buffer> {
  const { width, height } = imageSizeForAspect(opts.aspect);
  const fontUri = await arabicFontUri();
  const brand = opts.locale === "en" ? "Arabya" : "عربية";
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

  const watermark = opts.watermark
    ? `<text x="${width / 2}" y="${height - Math.round(height * 0.04)}" text-anchor="middle" fill="#99f6e4" font-size="${Math.round(width * 0.028)}" opacity="0.55">${escapeXml(brand)}</text>`
    : `<text x="${width - padX}" y="${height - Math.round(height * 0.035)}" text-anchor="end" fill="#99f6e4" font-size="${Math.round(width * 0.022)}" opacity="0.75">${escapeXml(brand)}</text>`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style type="text/css"><![CDATA[
      @font-face { font-family: 'NotoNaskh'; src: url('${fontUri}'); }
      text { font-family: 'NotoNaskh', sans-serif; }
    ]]></style>
  </defs>
  ${bg}
  <text x="${width - padX}" y="${Math.round(height * 0.08)}" text-anchor="end" direction="rtl" fill="#99f6e4" font-size="${titleSize}" opacity="0.95">${escapeXml(title)}</text>
  ${ayahSvg}
  ${trSvg}
  ${watermark}
</svg>`;

  const fontFile = path.join(
    process.cwd(),
    "public/fonts/NotoNaskhArabic-Regular.ttf",
  );
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: {
      loadSystemFonts: false,
      fontFiles: [fontFile],
      defaultFontFamily: "Noto Naskh Arabic",
    },
  });
  return Buffer.from(resvg.render().asPng());
}
