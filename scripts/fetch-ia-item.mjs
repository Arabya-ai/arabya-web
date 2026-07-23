/**
 * Fetch Internet Archive item metadata (+ optional best text file) into incoming/ia/.
 * Does NOT publish into data/ — review rights before import-from-incoming.
 *
 * Usage:
 *   node scripts/fetch-ia-item.mjs --identifier=ITEM_ID
 *   node scripts/fetch-ia-item.mjs --identifier=ITEM_ID --download-text
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function pickTextFile(files) {
  if (!Array.isArray(files)) return null;
  const scored = files
    .filter((f) => f && f.name && !f.name.endsWith(".gz"))
    .map((f) => {
      const name = String(f.name).toLowerCase();
      let score = 0;
      if (name.endsWith("_djvu.txt") || name.endsWith(".txt")) score += 5;
      if (name.includes("djvu.txt")) score += 3;
      if (name.endsWith(".epub")) score += 1;
      if (f.format && /text|djvu/i.test(String(f.format))) score += 2;
      return { f, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.f ?? null;
}

async function main() {
  const identifier = arg("identifier");
  if (!identifier) {
    console.error(
      "Usage: node scripts/fetch-ia-item.mjs --identifier=ITEM_ID [--download-text]",
    );
    process.exit(1);
  }

  const metaUrl = `https://archive.org/metadata/${encodeURIComponent(identifier)}`;
  const res = await fetch(metaUrl);
  if (!res.ok) {
    console.error(`Metadata fetch failed: HTTP ${res.status}`);
    process.exit(1);
  }
  const meta = await res.json();
  const metadata = meta.metadata || {};
  const outDir = path.join(root, "incoming", "ia", identifier);
  await mkdir(outDir, { recursive: true });

  const summary = {
    fetchedAt: new Date().toISOString(),
    identifier,
    iaItemUrl: `https://archive.org/details/${identifier}`,
    title: metadata.title || "",
    creator: metadata.creator || "",
    date: metadata.date || metadata.publicdate || "",
    rights: metadata.rights || "",
    licenseurl: metadata.licenseurl || "",
    possibleCopyrightStatus: metadata["possible-copyright-status"] || "",
    mediatype: metadata.mediatype || "",
    language: metadata.language || "",
    filesCount: Array.isArray(meta.files) ? meta.files.length : 0,
    reviewRequired: true,
    note:
      "Local staging only. Do not copy into data/ unless rights allow redistribution in this project.",
  };

  await writeFile(
    path.join(outDir, "meta.ia.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );
  await writeFile(
    path.join(outDir, "metadata.raw.json"),
    JSON.stringify(meta, null, 2),
    "utf8",
  );

  console.log(`Saved metadata → incoming/ia/${identifier}/meta.ia.json`);
  console.log(`  title: ${summary.title || "(none)"}`);
  console.log(`  rights: ${summary.rights || "(none listed)"}`);
  console.log(`  licenseurl: ${summary.licenseurl || "(none)"}`);

  if (!hasFlag("download-text")) {
    console.log("Skip text download (pass --download-text to fetch best text file).");
    return;
  }

  const best = pickTextFile(meta.files);
  if (!best) {
    console.warn("No suitable text file found in item.");
    return;
  }

  const fileUrl = `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(best.name)}`;
  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) {
    console.error(`Text download failed: HTTP ${fileRes.status}`);
    process.exit(1);
  }
  const buf = Buffer.from(await fileRes.arrayBuffer());
  const safeName = String(best.name).replace(/[^\w.\-()+]/g, "_");
  await writeFile(path.join(outDir, safeName), buf);
  await writeFile(
    path.join(outDir, "download.json"),
    JSON.stringify(
      {
        name: best.name,
        format: best.format || null,
        size: best.size || null,
        savedAs: safeName,
        url: fileUrl,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`Downloaded text → incoming/ia/${identifier}/${safeName}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
