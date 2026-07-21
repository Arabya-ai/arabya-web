/**
 * Rebuild data/roots-index.json from data/irab/*.json with ALL occurrences
 * (no 250 cap). Does not rewrite irab files.
 *
 * Usage: node scripts/expand-roots-index.mjs
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const irabDir = path.join(root, "data", "irab");

/** @type {Map<string, { root: string, count: number, occurrences: object[] }>} */
const roots = new Map();

const files = (await readdir(irabDir))
  .filter((f) => /^\d+\.json$/.test(f))
  .sort((a, b) => Number(a) - Number(b));

for (const file of files) {
  const surahId = Number(file.replace(".json", ""));
  const data = JSON.parse(await readFile(path.join(irabDir, file), "utf8"));
  for (const verse of data.verses ?? []) {
    for (const word of verse.words ?? []) {
      if (!word.root) continue;
      if (!roots.has(word.root)) {
        roots.set(word.root, { root: word.root, count: 0, occurrences: [] });
      }
      const entry = roots.get(word.root);
      entry.count += 1;
      entry.occurrences.push({
        wordId: word.wordId,
        surahId,
        verse: verse.verseNumber,
        position: word.position,
        surface: word.surface,
        ...(word.lemma ? { lemma: word.lemma } : {}),
      });
    }
  }
  process.stdout.write(`roots from surah ${surahId}\n`);
}

const rootsList = [...roots.values()].sort((a, b) =>
  a.root.localeCompare(b.root, "ar"),
);

const payload = {
  source: "Quranic Arabic Corpus morphology (corpus.quran.com) via mustafa0x/quran-morphology",
  sourceUrl: "http://corpus.quran.com",
  license: "GNU GPL — attribution required",
  rootCount: rootsList.length,
  occurrenceCap: null,
  note: "occurrences list every morph word with ROOT; count is the full corpus total.",
  roots: rootsList,
};

await writeFile(
  path.join(root, "data", "roots-index.json"),
  JSON.stringify(payload),
  "utf8",
);

const occSum = rootsList.reduce((n, r) => n + r.occurrences.length, 0);
process.stdout.write(
  `wrote roots-index.json: ${rootsList.length} roots, ${occSum} occurrences\n`,
);
