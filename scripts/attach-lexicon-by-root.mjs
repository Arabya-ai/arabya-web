/**
 * Attach lexiconKey on word-senses using QAC morphology roots when the root
 * exists in data/lexicon/quran-words.json (shared etymology across the Quran).
 *
 * Usage: node scripts/attach-lexicon-by-root.mjs
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

async function main() {
  const lexicon = JSON.parse(
    await readFile(path.join(root, "data/lexicon/quran-words.json"), "utf8"),
  );
  const entryKeys = new Set(Object.keys(lexicon.entries || {}));
  const senseFiles = (await readdir(path.join(root, "data/word-senses"))).filter(
    (f) => /^\d+\.json$/.test(f),
  );

  let attached = 0;
  let already = 0;
  let words = 0;

  for (const file of senseFiles) {
    const sid = Number(file.replace(".json", ""));
    const sensePath = path.join(root, "data/word-senses", file);
    const senses = JSON.parse(await readFile(sensePath, "utf8"));
    let irab = null;
    try {
      irab = JSON.parse(
        await readFile(path.join(root, "data/irab", `${sid}.json`), "utf8"),
      );
    } catch {
      continue;
    }
    const byId = new Map();
    for (const verse of irab.verses || []) {
      for (const w of verse.words || []) {
        if (w.wordId) byId.set(w.wordId, w);
      }
    }

    let changed = false;
    for (const [wordId, entry] of Object.entries(senses.words)) {
      words += 1;
      if (entry.lexiconKey && entryKeys.has(entry.lexiconKey)) {
        already += 1;
        continue;
      }
      const morph = byId.get(wordId);
      const rootKey = morph?.root?.trim();
      if (rootKey && entryKeys.has(rootKey)) {
        entry.lexiconKey = rootKey;
        attached += 1;
        changed = true;
      }
    }
    if (changed) {
      senses.wordCount = Object.keys(senses.words).length;
      await writeFile(sensePath, `${JSON.stringify(senses)}\n`, "utf8");
    }
  }

  console.log({ words, already, attached, lexiconKeys: entryKeys.size });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
