#!/usr/bin/env node
/**
 * Generate PNG cover thumbnails (page 1) for git-shipped library PDFs.
 * Usage: node scripts/generate-library-covers.mjs
 */
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(root, "..");

async function generatePdfCoverThumbnail(pdfBuffer, width = 480) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: pdfBuffer });
  try {
    const shot = await parser.getScreenshot({
      partial: [1],
      desiredWidth: width,
      imageBuffer: true,
    });
    const page = shot.pages?.[0];
    if (!page?.data?.length) return null;
    return Buffer.from(page.data);
  } finally {
    await parser.destroy();
  }
}

async function main() {
  const indexPath = path.join(repo, "data", "library", "index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const coversDir = path.join(repo, "public", "media", "library", "covers");
  const mediaDir = path.join(repo, "public", "media", "library");
  await mkdir(coversDir, { recursive: true });

  let updated = 0;
  for (const work of index.works ?? []) {
    const pdfPath = path.join(mediaDir, `${work.id}.pdf`);
    const coverPath = path.join(coversDir, `${work.id}.png`);
    try {
      await access(pdfPath);
    } catch {
      console.warn(`skip ${work.id}: no PDF at ${pdfPath}`);
      continue;
    }
    const pdf = await readFile(pdfPath);
    const png = await generatePdfCoverThumbnail(pdf);
    if (!png) {
      console.warn(`skip ${work.id}: cover render failed`);
      continue;
    }
    await writeFile(coverPath, png);
    work.coverUrl = `/media/library/covers/${work.id}.png`;
    updated++;
    console.log(`cover ${work.id} -> ${coverPath}`);
  }

  if (updated > 0) {
    await writeFile(indexPath, JSON.stringify(index, null, 2) + "\n", "utf8");
  }
  console.log(`done: ${updated} cover(s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
