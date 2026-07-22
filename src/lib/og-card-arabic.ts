import { readFile } from "node:fs/promises";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { OG_IMAGE_SIZE } from "@/lib/og-meta";
import type { OgCardContent } from "@/lib/og-card";

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
  return lines.slice(0, 4);
}

/**
 * Arabic OG card via resvg (HarfBuzz shaping) — avoids Satori GSUB crashes.
 * Kept separate from og-card.tsx so static opengraph routes never load native resvg.
 */
export async function renderOgCard(opts: OgCardContent) {
  const fontUri = await arabicFontUri();
  const brand = "عربية";
  const eyebrow = opts.eyebrow ?? "";
  const title = opts.title;
  const subtitle = opts.subtitle ?? "";
  const ayahLine = opts.ayahLine ?? "";
  const footer = opts.footer ?? "دراسة كلمات القرآن";

  const titleLines = wrapLines(title, 28);
  const subtitleLines = wrapLines(subtitle, 42);
  const ayahLines = wrapLines(ayahLine, 36);

  let y = 210;
  const titleSvg = titleLines
    .map((line, i) => {
      return `<text x="1144" y="${y + i * 62}" text-anchor="end" direction="rtl" xml:lang="ar" fill="#ecfdf5" font-size="50" font-weight="700">${escapeXml(line)}</text>`;
    })
    .join("\n");
  y += titleLines.length * 62 + 18;

  const subtitleSvg = subtitleLines
    .map((line, i) => {
      return `<text x="1144" y="${y + i * 38}" text-anchor="end" direction="rtl" xml:lang="ar" fill="#ccfbf1" font-size="28" opacity="0.92">${escapeXml(line)}</text>`;
    })
    .join("\n");
  y += subtitleLines.length ? subtitleLines.length * 38 + 24 : 0;

  let ayahSvg = "";
  if (ayahLines.length) {
    const boxH = ayahLines.length * 44 + 36;
    ayahSvg = `
      <rect x="56" y="${y}" width="1088" height="${boxH}" rx="16" fill="rgba(15,23,42,0.28)" stroke="rgba(153,246,228,0.35)" stroke-width="1"/>
      ${ayahLines
        .map(
          (line, i) =>
            `<text x="1144" y="${y + 40 + i * 44}" text-anchor="end" direction="rtl" xml:lang="ar" fill="#ecfdf5" font-size="30">${escapeXml(line)}</text>`,
        )
        .join("\n")}
    `;
  }

  const eyebrowSvg = eyebrow
    ? `<text x="1144" y="168" text-anchor="end" direction="rtl" xml:lang="ar" fill="#99f6e4" font-size="26" opacity="0.9">${escapeXml(eyebrow)}</text>`
    : "";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${OG_IMAGE_SIZE.width}" height="${OG_IMAGE_SIZE.height}" viewBox="0 0 ${OG_IMAGE_SIZE.width} ${OG_IMAGE_SIZE.height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f766e"/>
      <stop offset="48%" stop-color="#134e4a"/>
      <stop offset="100%" stop-color="#0b1412"/>
    </linearGradient>
    <style type="text/css"><![CDATA[
      @font-face {
        font-family: 'NotoNaskh';
        src: url('${fontUri}');
      }
      text { font-family: 'NotoNaskh', sans-serif; }
    ]]></style>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="1144" y="78" text-anchor="end" direction="rtl" xml:lang="ar" fill="#ecfdf5" font-size="38" font-weight="700">${escapeXml(brand)}</text>
  ${eyebrowSvg}
  ${titleSvg}
  ${subtitleSvg}
  ${ayahSvg}
  <text x="1144" y="580" text-anchor="end" direction="rtl" xml:lang="ar" fill="#99f6e4" font-size="22" opacity="0.8">${escapeXml(footer)}</text>
</svg>`;

  const fontFile = path.join(
    process.cwd(),
    "public/fonts/NotoNaskhArabic-Regular.ttf",
  );
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: OG_IMAGE_SIZE.width },
    font: {
      loadSystemFonts: false,
      fontFiles: [fontFile],
      defaultFontFamily: "Noto Naskh Arabic",
    },
  });
  const png = resvg.render().asPng();

  return new Response(Buffer.from(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, immutable, no-transform, max-age=86400",
    },
  });
}
