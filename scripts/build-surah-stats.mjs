/**
 * Build data/surah-stats.json from data/surahs/{1..114}.json
 * Counts: verses, words (charType word / default), Arabic letters (tashkeel stripped).
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const surahsDir = path.join(root, "data", "surahs");
const outPath = path.join(root, "data", "surah-stats.json");

/** Remove combining marks / Quran annotation marks commonly used as tashkeel. */
function stripTashkeel(text) {
  return text.replace(
    /[\u064B-\u065F\u0670\u06D6-\u06ED\u08F0-\u08FF]/g,
    "",
  );
}

/** Count Arabic letters (hamza through yeh + common Quran letter forms). */
function countArabicLetters(text) {
  const cleaned = stripTashkeel(text);
  const matches = cleaned.match(/[\u0621-\u064A\u066E\u066F\u0671-\u06D3\u06FA-\u06FF]/g);
  return matches ? matches.length : 0;
}

function isWordToken(w) {
  if (!w || typeof w.text !== "string") return false;
  if (w.charType && w.charType !== "word") return false;
  return w.text.trim().length > 0;
}

const stats = {};

for (let id = 1; id <= 114; id++) {
  const raw = await readFile(path.join(surahsDir, `${id}.json`), "utf8");
  const surah = JSON.parse(raw);
  let words = 0;
  let letters = 0;
  for (const verse of surah.verses ?? []) {
    for (const w of verse.words ?? []) {
      if (!isWordToken(w)) continue;
      words += 1;
      letters += countArabicLetters(w.text);
    }
  }
  stats[String(id)] = {
    surahId: id,
    verses: surah.versesCount ?? (surah.verses?.length ?? 0),
    words,
    letters,
  };
}

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(
  outPath,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), surahs: stats }, null, 2)}\n`,
  "utf8",
);

console.log(`Wrote ${outPath} (${Object.keys(stats).length} surahs)`);
console.log(`Fatiha sample:`, stats["1"]);
