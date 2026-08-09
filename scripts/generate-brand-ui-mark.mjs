/**
 * Compact brand mark for header/footer/sidebar (not for canvas export).
 * Usage: node scripts/generate-brand-ui-mark.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brand = path.resolve(__dirname, "../public/brand");
const source = path.join(brand, "arabya-mark-square.png");

if (!fs.existsSync(source)) {
  console.error("Missing source:", source);
  process.exit(1);
}

const size = 128;
const webpOut = path.join(brand, "arabya-mark-ui.webp");
const pngOut = path.join(brand, "arabya-mark-ui.png");

await sharp(source)
  .resize(size, size, {
    fit: "contain",
    kernel: sharp.kernel.lanczos3,
  })
  .webp({ quality: 82, effort: 6 })
  .toFile(webpOut);

await sharp(source)
  .resize(size, size, {
    fit: "contain",
    kernel: sharp.kernel.lanczos3,
  })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(pngOut);

for (const file of [webpOut, pngOut]) {
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(path.basename(file), `${kb} KB`);
}
