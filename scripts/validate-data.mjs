/**
 * Validates Quran data integrity: surahs 1–114, irab alignment, mushaf pages.
 */
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const data = path.join(root, "data");

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const errors = [];
  const warnings = [];

  for (let id = 1; id <= 114; id++) {
    const surahPath = path.join(data, "surahs", `${id}.json`);
    const irabPath = path.join(data, "irab", `${id}.json`);
    if (!(await exists(surahPath))) errors.push(`missing surah ${id}`);
    if (!(await exists(irabPath))) errors.push(`missing irab ${id}`);
    if (!(await exists(surahPath)) || !(await exists(irabPath))) continue;

    const surah = JSON.parse(await readFile(surahPath, "utf8"));
    const irab = JSON.parse(await readFile(irabPath, "utf8"));

    const surahVerses = new Map(
      (surah.verses ?? []).map((v) => [
        v.verseNumber,
        (v.words ?? []).filter((w) => !w.charType || w.charType === "word"),
      ]),
    );
    const irabVerses = new Map(
      (irab.verses ?? []).map((v) => [v.verseNumber, v.words ?? []]),
    );

    let missingMeaning = 0;
    let missingWordId = 0;

    for (const [vn, words] of surahVerses) {
      const iw = irabVerses.get(vn);
      if (!iw) {
        errors.push(`surah ${id} verse ${vn}: missing in irab`);
        continue;
      }
      if (iw.length !== words.length) {
        warnings.push(
          `surah ${id}:${vn} word count surah=${words.length} irab=${iw.length}`,
        );
      }
      for (const w of words) {
        if (!w.meaningAr) missingMeaning += 1;
      }
      for (const w of iw) {
        if (!w.wordId) missingWordId += 1;
      }
    }

    if (missingMeaning > 0) {
      warnings.push(`surah ${id}: ${missingMeaning} words missing meaningAr`);
    }
    if (missingWordId > 0) {
      errors.push(`surah ${id}: ${missingWordId} irab words missing wordId`);
    }
  }

  const mushafPath = path.join(data, "mushaf-index.json");
  if (!(await exists(mushafPath))) {
    errors.push("missing mushaf-index.json");
  } else {
    const mushaf = JSON.parse(await readFile(mushafPath, "utf8"));
    if (mushaf.totalPages !== 604) {
      errors.push(`mushaf totalPages=${mushaf.totalPages}, expected 604`);
    }
    for (let p = 1; p <= 604; p++) {
      if (!mushaf.pages?.[String(p)]) errors.push(`missing mushaf page ${p}`);
    }
  }

  if (!(await exists(path.join(data, "search-index.json")))) {
    errors.push("missing search-index.json — run build-search-index");
  }
  if (!(await exists(path.join(data, "roots-index.json")))) {
    errors.push("missing roots-index.json — run build-irab");
  }

  const sample = JSON.parse(
    await readFile(path.join(data, "surahs", "1.json"), "utf8"),
  );
  const fatihaW3 = sample.verses?.[0]?.words?.[2]?.meaningAr ?? "";
  if (fatihaW3.includes("حرف جر")) {
    errors.push(
      `meaningAr quality: 1:1:3 should not be حرف جر (got "${fatihaW3}")`,
    );
  }

  for (const w of warnings) console.warn("WARN:", w);
  for (const e of errors) console.error("ERR:", e);

  if (errors.length) {
    console.error(`Validation failed: ${errors.length} error(s)`);
    process.exit(1);
  }
  console.log(
    `Validation OK (${warnings.length} warning(s), ${114} surahs checked)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
