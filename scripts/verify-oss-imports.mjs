#!/usr/bin/env node
/**
 * Safety checks for OSS hadith/heritage imports before publish.
 * Does not hit external networks (except optional --live).
 *
 * Run: node scripts/verify-oss-imports.mjs
 *      node scripts/verify-oss-imports.mjs --live
 */
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const HADITH = path.join(ROOT, "data", "hadith");
const HERITAGE = path.join(ROOT, "data", "heritage");
const live = process.argv.includes("--live");

const errors = [];
const warnings = [];

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, "utf8"));
}

async function main() {
  const index = await readJson(path.join(HADITH, "index.json"));
  const cols = index.collections ?? [];
  if (cols.length < 10) errors.push(`hadith collections too few: ${cols.length}`);

  let totalItems = 0;
  for (const meta of cols) {
    const file = path.join(HADITH, "collections", `${meta.slug}.json`);
    const col = await readJson(file);
    if (col.slug !== meta.slug) {
      errors.push(`slug mismatch ${meta.slug}`);
    }
    if (!Array.isArray(col.items) || col.items.length === 0) {
      errors.push(`empty collection ${meta.slug}`);
      continue;
    }
    totalItems += col.items.length;
    const sample = col.items[0];
    if (!sample.id?.startsWith("H:") || !sample.arabic) {
      errors.push(`bad item shape in ${meta.slug}`);
    }
    // Sanity: arabic should be mostly Arabic letters
    const ar = String(sample.arabic).replace(/<[^>]+>/g, "");
    const arabicChars = (ar.match(/[\u0600-\u06FF]/g) || []).length;
    if (arabicChars < 10) {
      errors.push(`${meta.slug} sample lacks Arabic text`);
    }
    if (meta.itemCount != null && meta.itemCount !== col.items.length) {
      warnings.push(
        `${meta.slug} index count ${meta.itemCount} != file ${col.items.length}`,
      );
    }
  }

  if (totalItems < 30000) {
    errors.push(`hadith total too low: ${totalItems}`);
  }

  // Ensure we did NOT leave multi-GB style dumps
  try {
    const isnadDir = path.join(HADITH, "isnad");
    const entries = await fs.readdir(isnadDir);
    let bytes = 0;
    for (const f of entries) {
      const st = await fs.stat(path.join(isnadDir, f));
      bytes += st.size;
    }
    if (bytes > 2 * 1024 * 1024) {
      warnings.push(
        `data/hadith/isnad is ${Math.round(bytes / 1024 / 1024)}MB — prefer live parse + CDN`,
      );
    }
  } catch {
    /* absent is fine — live mode */
  }

  const hIndex = await readJson(path.join(HERITAGE, "index.json"));
  for (const w of hIndex.works ?? []) {
    const work = await readJson(path.join(HERITAGE, "works", `${w.slug}.json`));
    if (!work.passages?.length) errors.push(`heritage empty ${w.slug}`);
  }

  if (live) {
    for (const url of [
      "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari/1.json",
      "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1.json",
      "https://raw.githubusercontent.com/rn0x/Historical_Encyclopedia/main/database/history.json",
    ]) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "arabya-verify-oss" },
          signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) errors.push(`live ${url} → ${res.status}`);
        else {
          // only read a bit for history
          if (url.includes("history.json")) {
            const buf = await res.arrayBuffer();
            if (buf.byteLength < 1000) errors.push("history.json too small");
          }
        }
      } catch (e) {
        errors.push(`live fetch failed ${url}: ${e.message || e}`);
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: errors.length === 0,
        totalHadithItems: totalItems,
        collections: cols.length,
        heritageWorks: (hIndex.works ?? []).length,
        errors,
        warnings,
        live,
      },
      null,
      2,
    ),
  );
  if (errors.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
