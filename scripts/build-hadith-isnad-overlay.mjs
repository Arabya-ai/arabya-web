#!/usr/bin/env node
/**
 * OPTIONAL offline isnad overlay builder.
 *
 * Default product path is LIVE: parse Arabic matn in-process and fetch
 * English “Narrated …” from fawazahmed0 CDN (see src/lib/hadith-isnad.ts).
 * Use this script only if you explicitly want cached JSON under
 * data/hadith/isnad/ (avoid committing multi‑MB dumps).
 *
 * Deferred (too large / gated for git): emadjumaah/hadith-kg (~1.6GB),
 * JehadOumer Ifta JSON (Kaggle), full Itqan rijal dumps.
 *
 * Run: node scripts/build-hadith-isnad-overlay.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), "data", "hadith");
const COL_DIR = path.join(ROOT, "collections");
const OUT_DIR = path.join(ROOT, "isnad");

const CDN = (edition) =>
  `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${edition}.min.json`;

/** Map our collection slug → English edition name when available. */
const ENG_EDITION = {
  bukhari: "eng-bukhari",
  muslim: "eng-muslim",
  abudawud: "eng-abudawud",
  tirmidhi: "eng-tirmidhi",
  nasai: "eng-nasai",
  ibnmajah: "eng-ibnmajah",
  malik: "eng-malik",
  nawawi: "eng-nawawi",
};

const TASHKEEL =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D4-\u08FF]/g;

function stripDiacritics(t) {
  return String(t || "").replace(TASHKEEL, "").replace(/\u0640/g, "");
}

function cleanName(s) {
  let t = stripDiacritics(s).trim();
  t = t.replace(/\s*رض[يى]\s*الله\s*عنه[ما]*\s*/g, " ");
  t = t.replace(/\s*عليه\s*السلام\s*/g, " ");
  t = t.replace(/\s*صلى\s*الله\s*عليه\s*.*$/g, "");
  t = t.replace(/\s*قال\s*:?\s*"?\s*$/g, "");
  t = t.replace(/\s*على\s+المنبر.*$/g, "");
  t = t.replace(/\s*في\s+المسجد.*$/g, "");
  t = t.replace(/[،,;؛:«»"']/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  // Drop trailing prophetic formula fragments left after split
  t = t.replace(/\s*صلى\s*الله\s*عليه\s*و?سلم\s*$/g, "").trim();
  return t;
}

function isNoiseName(name) {
  if (!name || name.length < 3 || name.length > 80) return true;
  if (/^(قال|قالت|أن|ان|انه|انها)$/.test(name)) return true;
  if (/رسول\s*الله/.test(name)) return true;
  if (/^النبي/.test(name)) return true;
  if (/صلى\s*الله/.test(name)) return true;
  if (/^الله$/.test(name)) return true;
  return false;
}

/**
 * Extract ordered narrator names from Arabic matn using transmission verbs.
 * Returns [] when the matn is companion-style (e.g. Nawawi «عن…») without
 * classical حدثنا chains — those still get narratorEn from eng when present.
 */
function extractNarrators(arabic) {
  const clean = stripDiacritics(arabic).replace(/<[^>]+>/g, " ");
  const verb =
    /(?:^|[\s،,])(?:حدثنا|حدثني|حدثه|اخبرنا|اخبرني|انبانا|انباني|سمعت|سمعنا)\s+/g;
  if (!verb.test(clean)) {
    // Companion-led: عن فلان قال
    const m = clean.match(
      /^عن\s+(.+?)\s+(?:رضي|قال|قالت|ان|أنه|أنها|أنه)/,
    );
    if (m) {
      const name = cleanName(m[1]);
      return !isNoiseName(name) ? [name] : [];
    }
    return [];
  }

  const parts = clean.split(
    /(?:^|[\s،,])(?:حدثنا|حدثني|حدثه|اخبرنا|اخبرني|انبانا|انباني|سمعت|سمعنا|عن)\s+/,
  );
  const names = [];
  for (const part of parts) {
    if (!part) continue;
    // Stop at matn markers
    let chunk = part.split(
      /(?:يقول|يقوله|أن رسول|ان رسول|أن النبي|ان النبي|قال رسول|قال النبي|سمعت رسول)/,
    )[0];
    chunk = chunk.split(/،|,/)[0];
    const name = cleanName(chunk);
    if (isNoiseName(name)) continue;
    if (!names.includes(name)) names.push(name);
    if (names.length >= 8) break;
  }
  return names;
}

function extractNarratorEn(engText) {
  const t = String(engText || "").trim();
  const m = /^(?:Narrated|It is narrated on the authority of)\s+(.+?)\s*:/i.exec(
    t,
  );
  if (!m) return undefined;
  return m[1].replace(/\s*\(ra\)\s*/gi, " ").replace(/\s+/g, " ").trim();
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "arabya-web-isnad" },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

async function loadEngMap(edition) {
  try {
    const payload = await fetchJson(CDN(edition));
    const map = new Map();
    for (const h of payload.hadiths ?? []) {
      const n = Number(h.hadithnumber ?? h.number);
      if (!Number.isFinite(n)) continue;
      const narratorEn = extractNarratorEn(h.text);
      if (narratorEn) map.set(n, narratorEn);
    }
    return map;
  } catch (err) {
    console.warn(`eng skip ${edition}:`, err.message || err);
    return new Map();
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const files = (await fs.readdir(COL_DIR)).filter((f) => f.endsWith(".json"));
  let totalWithChain = 0;
  let totalWithEn = 0;

  for (const file of files) {
    const slug = file.replace(/\.json$/, "");
    const col = JSON.parse(
      await fs.readFile(path.join(COL_DIR, file), "utf8"),
    );
    const engMap = ENG_EDITION[slug]
      ? await loadEngMap(ENG_EDITION[slug])
      : new Map();

    const items = {};
    for (const item of col.items ?? []) {
        const narrators = extractNarrators(item.arabic || "").slice(0, 8);
      const narratorEn = engMap.get(item.number);
      if (!narrators.length && !narratorEn) continue;
      const entry = {
        narrators,
        source: narrators.length
          ? "parsed-matn+fawazahmed0-eng"
          : "fawazahmed0-eng",
      };
      if (narratorEn) {
        entry.narratorEn = narratorEn;
        totalWithEn += 1;
      }
      if (narrators.length) {
        totalWithChain += 1;
      }
      items[String(item.number)] = entry;
    }

    const out = {
      collection: slug,
      updatedAt: new Date().toISOString().slice(0, 10),
      source:
        "Arabic matn parse (transmission verbs) + fawazahmed0 eng Narrated lead-in",
      method:
        "Bounded overlay keyed by hadith number — not full hadith-kg / Ifta dumps",
      itemCount: Object.keys(items).length,
      items,
    };
    await fs.writeFile(
      path.join(OUT_DIR, `${slug}.json`),
      JSON.stringify(out),
      "utf8",
    );
    console.log(
      `${slug}: ${out.itemCount} overlays (of ${col.items?.length ?? 0})`,
    );
  }

  console.log(
    `Done. withChain≈${totalWithChain} withNarratorEn≈${totalWithEn}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
