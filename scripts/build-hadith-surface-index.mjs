#!/usr/bin/env node
/**
 * Build a compact surface→morph/sense index from Quran QAC + word-senses
 * for hadith word-layer enrichment (analogy, not hadith-specific iʿrāb).
 *
 * Output: data/hadith/surface-index.json
 * Run: node scripts/build-hadith-surface-index.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const IRAB = path.join(ROOT, "data", "irab");
const SENSES = path.join(ROOT, "data", "word-senses");
const OUT = path.join(ROOT, "data", "hadith", "surface-index.json");

const TASHKEEL =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D4-\u08FF]/g;

function normalize(raw) {
  return String(raw || "")
    .replace(TASHKEEL, "")
    .replace(/\u0640/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0600-\u06FF]/g, "")
    .trim();
}

async function main() {
  /** @type {Map<string, {count:number, root?:string, lemma?:string, pos?:string[], features?:string[], wordId?:string, sense?:string|null, lexiconKey?:string|null}>} */
  const map = new Map();

  for (let sid = 1; sid <= 114; sid++) {
    const irab = JSON.parse(
      await fs.readFile(path.join(IRAB, `${sid}.json`), "utf8"),
    );
    let senses = null;
    try {
      senses = JSON.parse(
        await fs.readFile(path.join(SENSES, `${sid}.json`), "utf8"),
      );
    } catch {
      /* optional */
    }
    for (const verse of irab.verses ?? []) {
      for (const w of verse.words ?? []) {
        const surface = w.surface || w.segments || "";
        const norm = normalize(surface);
        if (norm.length < 2) continue;
        const senseEntry = w.wordId
          ? senses?.words?.[w.wordId]
          : null;
        const prev = map.get(norm);
        const next = {
          count: (prev?.count ?? 0) + 1,
          root: w.root || prev?.root,
          lemma: w.lemma || prev?.lemma,
          pos: Array.isArray(w.pos) ? w.pos : prev?.pos,
          features: Array.isArray(w.features) ? w.features : prev?.features,
          wordId: w.wordId || prev?.wordId,
          sense:
            (senseEntry?.sense && String(senseEntry.sense).trim()) ||
            prev?.sense ||
            null,
          lexiconKey:
            senseEntry?.lexiconKey || prev?.lexiconKey || w.root || null,
        };
        // Prefer entries that have both root and sense when replacing
        if (
          !prev ||
          next.count > prev.count ||
          (!prev.sense && next.sense) ||
          (!prev.root && next.root)
        ) {
          map.set(norm, next);
        } else {
          map.set(norm, { ...prev, count: next.count });
        }
      }
    }
  }

  const entries = {};
  for (const [norm, v] of map) {
    entries[norm] = {
      root: v.root || null,
      lemma: v.lemma || null,
      pos: v.pos || [],
      features: (v.features || []).slice(0, 12),
      sampleWordId: v.wordId || null,
      sense: v.sense || null,
      lexiconKey: v.lexiconKey || null,
      freq: v.count,
    };
  }

  const out = {
    updatedAt: new Date().toISOString().slice(0, 10),
    source:
      "Quranic Arabic Corpus morph (data/irab) + word-senses — surface analogy for hadith tokens",
    matchKind: "quran-surface-analogy",
    disclaimer:
      "Morph/sense borrowed from matching Quran surface forms; not hadith-specific iʿrāb.",
    entryCount: Object.keys(entries).length,
    entries,
  };

  await fs.writeFile(OUT, JSON.stringify(out), "utf8");
  const st = await fs.stat(OUT);
  console.log(
    `Wrote ${out.entryCount} surfaces → ${OUT} (${Math.round(st.size / 1024)} KB)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
