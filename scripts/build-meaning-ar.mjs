/**
 * Builds approximate Arabic word-by-word study glosses from morphology
 * (lemma + POS labels). Not a licensed semantic translation — clearly
 * labeled in the UI until an open Arabic WBW source is available.
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

/**
 * Pick the most meaningful Arabic POS label for a word.
 * Prefer content categories over DET/preposition prefixes.
 */
function pickPosLabel(morph, terms) {
  const pos = morph.pos ?? [];
  const features = morph.features ?? [];
  const hasDet = pos.includes("DET") || features.includes("DET");
  const hasPn = pos.includes("PN") || features.includes("PN");
  const isRealPrep = features.includes("P") && !hasDet;

  if (hasPn) return terms.types?.PN;

  for (const code of CONTENT_POS) {
    if (code === "PN") continue;
    if (pos.includes(code) && terms.types?.[code]) return terms.types[code];
  }

  if (hasDet && !isRealPrep) return terms.particles?.DET;

  if (isRealPrep || (pos.includes("P") && features.includes("P"))) {
    return terms.particles?.P;
  }

  for (const p of pos) {
    if (terms.types?.[p]) return terms.types[p];
    if (terms.particles?.[p]) return terms.particles[p];
  }
  return null;
}

async function main() {
  const terms = JSON.parse(
    await readFile(
      path.join(root, "data", "sources", "morphology-terms-ar.json"),
      "utf8",
    ),
  );

  const files = (await readdir(surahDir)).filter((f) => f.endsWith(".json"));
  let patched = 0;

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

        const bits = [];
        if (morph.lemma) bits.push(morph.lemma);
        else if (morph.root) bits.push(`جذر ${morph.root}`);

        const posLabel = pickPosLabel(morph, terms);
        if (posLabel && !bits.includes(posLabel)) bits.push(posLabel);

        word.meaningAr = bits.length ? bits.join(" · ") : word.meaningAr || "";
        patched += 1;
      }
    }

    await writeFile(surahPath, JSON.stringify(surah), "utf8");
    process.stdout.write(`meaning-ar ${id}\n`);
  }

  console.log("Patched Arabic morphology glosses on", patched, "words");
  console.log(
    "Note: meaningAr is morphology-based study gloss, not semantic WBW translation.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
