/**
 * Builds Arabic word-by-word study glosses:
 * 1) Semantic sense from Arabya lemma dictionary (preferred)
 * 2) Morphology fallback (lemma + POS) when no sense
 *
 * Not a licensed third-party Arabic WBW dump — see lemma-sense-ar.json license note.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const surahDir = path.join(root, "data", "surahs");
const irabDir = path.join(root, "data", "irab");

const CONTENT_POS = [
  "V",
  "N",
  "PN",
  "PRON",
  "DEM",
  "REL",
  "T",
  "LOC",
  "NV",
  "COND",
  "INTG",
];

function featureSet(morph) {
  return new Set([...(morph.pos ?? []), ...(morph.features ?? [])]);
}

function isRealPrep(morph) {
  const feats = featureSet(morph);
  const pos = morph.pos ?? [];
  if (feats.has("CONJ") || feats.has("NEG") || feats.has("VOC")) return false;
  return feats.has("P") || pos.includes("P");
}

function hasContentStem(morph) {
  const pos = morph.pos ?? [];
  const feats = featureSet(morph);
  if (feats.has("PN") || pos.includes("PN")) return true;
  if (pos.includes("V") || feats.has("V")) return true;
  if (feats.has("REL") || feats.has("DEM")) return true;
  if (morph.root) return true;
  if ((pos.includes("PRON") || feats.has("PRON")) && !isRealPrep(morph)) {
    return true;
  }
  if ((pos.includes("N") || feats.has("N")) && !feats.has("PRON")) return true;
  return false;
}

function pickPosLabel(morph, terms) {
  const feats = featureSet(morph);
  const pos = morph.pos ?? [];

  if (feats.has("PN")) return terms.types?.PN;
  if (feats.has("NEG")) return terms.particles?.NEG;
  if (feats.has("VOC")) return terms.particles?.VOC;
  if (feats.has("REL")) return terms.types?.REL;
  if (feats.has("DEM")) return terms.types?.DEM;

  if (isRealPrep(morph) && !hasContentStem(morph)) {
    return terms.particles?.P;
  }

  if (feats.has("PRON") || pos.includes("PRON")) return terms.types?.PRON;
  if (feats.has("CONJ") && !CONTENT_POS.some((c) => pos.includes(c))) {
    return terms.particles?.CONJ;
  }

  for (const code of CONTENT_POS) {
    if (code === "PN") continue;
    if (pos.includes(code) && terms.types?.[code]) return terms.types[code];
  }

  if (isRealPrep(morph)) return terms.particles?.P;
  if (feats.has("DET")) return terms.particles?.DET;

  for (const p of pos) {
    if (terms.types?.[p]) return terms.types[p];
    if (terms.particles?.[p]) return terms.particles[p];
  }

  for (const f of morph.features ?? []) {
    if (terms.particles?.[f]) return terms.particles[f];
  }
  return null;
}

function pickVerbDetail(morph, terms) {
  const feats = featureSet(morph);
  if (!feats.has("V") && !(morph.pos ?? []).includes("V")) return null;

  const tense =
    (feats.has("PERF") && terms.verb_tenses?.PERF) ||
    (feats.has("IMPF") && terms.verb_tenses?.IMPF) ||
    (feats.has("IMPV") && terms.verb_tenses?.IMPV) ||
    null;

  const voice = feats.has("PASS") ? terms.attrs?.PASS : null;
  const parts = ["فعل", tense, voice].filter(Boolean);
  return parts.join(" ");
}

function pickNounDetail(morph, terms) {
  const feats = featureSet(morph);
  const isVerb = feats.has("V") || (morph.pos ?? []).includes("V");
  if (isVerb) return null;

  const form =
    (feats.has("ACT_PCPL") && terms.noun_forms?.ACT_PCPL) ||
    (feats.has("PASS_PCPL") && terms.noun_forms?.PASS_PCPL) ||
    (feats.has("VN") && terms.noun_forms?.VN) ||
    null;

  const grammar =
    (feats.has("NOM") && terms.noun_grammar?.NOM) ||
    (feats.has("ACC") && terms.noun_grammar?.ACC) ||
    (feats.has("GEN") && terms.noun_grammar?.GEN) ||
    null;

  const adj = feats.has("ADJ") ? terms.attrs?.ADJ : null;
  return [form, grammar, adj].filter(Boolean).join(" · ") || null;
}

function buildMorphGloss(morph, terms) {
  const bits = [];
  if (morph.lemma) bits.push(morph.lemma);
  else if (morph.root) bits.push(`جذر ${morph.root}`);

  const verbDetail = pickVerbDetail(morph, terms);
  if (verbDetail) {
    bits.push(verbDetail);
  } else {
    const posLabel = pickPosLabel(morph, terms);
    if (posLabel && !bits.includes(posLabel)) bits.push(posLabel);
    const nounDetail = pickNounDetail(morph, terms);
    if (nounDetail) {
      for (const part of nounDetail.split(" · ")) {
        if (part && !bits.includes(part)) bits.push(part);
      }
    }
  }

  if (morph.root && morph.lemma && !bits.some((b) => b.includes(morph.root))) {
    const hasContent =
      (morph.pos ?? []).some((p) => ["V", "N", "PN"].includes(p)) ||
      featureSet(morph).has("ACT_PCPL") ||
      featureSet(morph).has("PASS_PCPL");
    if (hasContent) bits.push(`جذر ${morph.root}`);
  }

  return bits.length ? bits.join(" · ") : "";
}

function buildGloss(morph, terms, senseMap) {
  const lemma = morph.lemma ? String(morph.lemma).trim() : "";
  const entry = lemma ? senseMap[lemma] : null;
  const sense = entry?.sense ? String(entry.sense).trim() : "";

  if (sense) {
    // Keep a light morph hint for verbs / content words when sense is short
    const verbDetail = pickVerbDetail(morph, terms);
    if (verbDetail && !sense.includes("فعل")) {
      return `${sense} · ${verbDetail}`;
    }
    return sense;
  }

  return buildMorphGloss(morph, terms);
}

async function main() {
  const terms = JSON.parse(
    await readFile(
      path.join(root, "data", "sources", "morphology-terms-ar.json"),
      "utf8",
    ),
  );

  let senseMap = {};
  try {
    const senseFile = JSON.parse(
      await readFile(
        path.join(root, "data", "sources", "lemma-sense-ar.json"),
        "utf8",
      ),
    );
    senseMap = senseFile.senses ?? {};
  } catch {
    console.warn(
      "lemma-sense-ar.json missing — run npm run build-lemma-sense-ar first",
    );
  }

  const files = (await readdir(surahDir)).filter((f) => f.endsWith(".json"));
  let patched = 0;
  let withSense = 0;

  for (const file of files) {
    const id = Number(file.replace(".json", ""));
    const surahPath = path.join(surahDir, file);
    const irabPath = path.join(irabDir, file);
    const surah = JSON.parse(await readFile(surahPath, "utf8"));
    let irab = null;
    try {
      irab = JSON.parse(await readFile(irabPath, "utf8"));
    } catch {
      continue;
    }

    const irabMap = new Map();
    for (const verse of irab.verses ?? []) {
      for (const w of verse.words ?? []) {
        irabMap.set(`${verse.verseNumber}:${w.position}`, w);
      }
    }

    for (const verse of surah.verses ?? []) {
      for (const word of verse.words ?? []) {
        if (word.charType && word.charType !== "word") continue;
        const morph = irabMap.get(`${verse.verseNumber}:${word.position}`);
        if (!morph) continue;

        const gloss = buildGloss(morph, terms, senseMap) || word.meaningAr || "";
        if (morph.lemma && senseMap[String(morph.lemma).trim()]) withSense += 1;
        word.meaningAr = gloss;
        patched += 1;
      }
    }

    await writeFile(surahPath, JSON.stringify(surah), "utf8");
    process.stdout.write(`meaning-ar ${id}\n`);
  }

  console.log("Patched Arabic glosses on", patched, "words");
  console.log("With semantic lemma sense:", withSense);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
