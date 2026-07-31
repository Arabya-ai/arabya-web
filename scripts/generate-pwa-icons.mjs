/**
 * Generate high-quality PWA / favicon assets from the master brand mark.
 * Source: public/brand/arabya-logo-raw.png (1024², white plate, full color).
 *
 * Usage: node scripts/generate-pwa-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const brand = path.join(root, "public", "brand");
const source = path.join(brand, "arabya-logo-raw.png");

if (!fs.existsSync(source)) {
  console.error("Missing source:", source);
  process.exit(1);
}

/** Full-bleed icon (purpose: any) — preserve white plate + colors. */
async function writeAny(size, outName) {
  const out = path.join(brand, outName);
  await sharp(source)
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 1, adaptiveFiltering: true })
    .toFile(out);
  console.log("wrote", outName, `${size}x${size}`);
}

/**
 * Maskable icon — logo inset ~72% so Android adaptive crop keeps the mark.
 * Soft brand teal plate behind white-safe mark for richer home-screen color.
 */
async function writeMaskable(size, outName) {
  const out = path.join(brand, outName);
  const inset = Math.round(size * 0.72);
  const mark = await sharp(source)
    .resize(inset, inset, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();

  // Brand teal plate (#0f766e) with subtle radial lift via nested composites.
  const plate = await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r: 15, g: 118, b: 110 },
    },
  })
    .png()
    .toBuffer();

  const left = Math.round((size - inset) / 2);
  const top = left;

  // White rounded “app tile” under the mark for crisp contrast on teal.
  const tileSize = Math.round(size * 0.78);
  const tileLeft = Math.round((size - tileSize) / 2);
  const radius = Math.round(tileSize * 0.22);
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect x="${tileLeft}" y="${tileLeft}" width="${tileSize}" height="${tileSize}" rx="${radius}" ry="${radius}" fill="#ffffff"/>
    </svg>`,
  );

  await sharp(plate)
    .composite([
      { input: svg, top: 0, left: 0 },
      { input: mark, top, left },
    ])
    .png({ compressionLevel: 1, adaptiveFiltering: true })
    .toFile(out);
  console.log("wrote", outName, `${size}x${size} maskable`);
}

async function main() {
  await writeAny(512, "icon-512.png");
  await writeAny(192, "icon-192.png");
  await writeAny(180, "apple-touch-icon.png");
  await writeAny(32, "favicon-32.png");
  await writeMaskable(512, "icon-maskable-512.png");
  await writeMaskable(192, "icon-maskable-192.png");
  // Do not overwrite arabya-mark-square.png — used at full visual weight in header/footer.
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
