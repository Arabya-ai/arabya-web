/**
 * Import senses from the public open-quran-view word-level tafseer dump
 * (scraped from quran-words.com; short meanings only, no etymology).
 *
 * Usage:
 *   node scripts/import-quran-words-tafseer-json.mjs --from=/tmp/qw-tafseer-v2.json
 *   node scripts/import-quran-words-tafseer-json.mjs --from=... --fill-missing-only
 */
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  alignSurahWords,
  normalizeArabic,
} from "./lib/quran-words-core.mjs";

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

async function main() {
  const from = arg("from");
  if (!from) {
    console.error(
      "Usage: node scripts/import-quran-words-tafseer-json.mjs --from=file.json [--fill-missing-only]",
    );
    process.exit(1);
  }
  const fillMissingOnly = hasFlag("fill-missing-only");
  const rows = JSON.parse(await readFile(path.resolve(from), "utf8"));
  if (!Array.isArray(rows)) throw new Error("expected array");

  /** @type {Map<number, Map<number, {word:string,sense:string,globalIndex:number}[]>>} */
  const bySurahVerse = new Map();
  for (const row of rows) {
    const sid = Number(row.surah);
    const verse = Number(row.verse);
    if (!sid || !verse) continue;
    if (!bySurahVerse.has(sid)) bySurahVerse.set(sid, new Map());
    const vm = bySurahVerse.get(sid);
    if (!vm.has(verse)) vm.set(verse, []);
    vm.get(verse).push({
      word: String(row.text || ""),
      sense: String(row.tafseer || "").trim(),
      globalIndex: Number(row.globalIndex) || 0,
    });
  }

  const sensesOut = path.join(root, "data", "word-senses");
  await mkdir(sensesOut, { recursive: true });

  let lexiconEntries = {};
  try {
    lexiconEntries = JSON.parse(
      await readFile(path.join(root, "data/lexicon/quran-words.json"), "utf8"),
    ).entries;
  } catch {
    /* none */
  }

  let totalMatched = 0;
  let totalWords = 0;
  const reports = [];

  for (let sid = 1; sid <= 114; sid++) {
    const existingPath = path.join(sensesOut, `${sid}.json`);
    if (fillMissingOnly) {
      try {
        await readFile(existingPath, "utf8");
        continue;
      } catch {
        /* missing — fill */
      }
    }

    const verseMap = bySurahVerse.get(sid);
    if (!verseMap) {
      reports.push({ surahId: sid, error: "missing-in-dump" });
      continue;
    }

    const qwWords = [];
    for (const [ayah, list] of [...verseMap.entries()].sort(
      (a, b) => a[0] - b[0],
    )) {
      for (const item of list) {
        qwWords.push({
          word: item.word,
          sense: item.sense,
          ayah,
          url: null,
          lexiconKey: null,
          quality: "open-quran-view-dump",
        });
      }
    }

    const surah = JSON.parse(
      await readFile(path.join(root, "data/surahs", `${sid}.json`), "utf8"),
    );
    const arabyaWords = [];
    for (const v of surah.verses) {
      for (const w of v.words) {
        if (w.charType === "end") continue;
        arabyaWords.push({
          verse: v.verseNumber,
          position: w.position,
          text: w.text,
        });
      }
    }
    totalWords += arabyaWords.length;

    const { aligned, report } = alignSurahWords({
      surahId: sid,
      arabyaWords,
      qwWords,
    });
    totalMatched += report.matched;
    reports.push(report);

    // Preserve existing lexicon keys / urls when merging over an existing file
    let prevWords = {};
    try {
      prevWords = JSON.parse(await readFile(existingPath, "utf8")).words || {};
    } catch {
      /* none */
    }

    const words = {};
    for (const a of aligned) {
      const prev = prevWords[a.wordId];
      words[a.wordId] = {
        sense: a.sense || prev?.sense || null,
        lexiconKey: prev?.lexiconKey || a.lexiconKey || null,
        url: prev?.url || a.url || null,
      };
    }
    // keep any previous entries we failed to realign
    for (const [id, entry] of Object.entries(prevWords)) {
      if (!words[id]) words[id] = entry;
    }

    await writeFile(
      path.join(sensesOut, `${sid}.json`),
      `${JSON.stringify({
        id: sid,
        source: "quran-words.com",
        sourceLabel: "تفسير كلمات القرآن الكريم (quran-words.com)",
        sourceUrl: "https://www.quran-words.com",
        wordCount: Object.keys(words).length,
        words,
      })}\n`,
      "utf8",
    );
    console.log(
      `surah ${sid}: matched ${report.matched}/${arabyaWords.length} (norm sample ok=${
        normalizeArabic(arabyaWords[0]?.text || "") ===
        normalizeArabic(qwWords[0]?.word || "")
      })`,
    );
  }

  // rewrite lexicon unchanged (etymology still from prior fetch)
  await writeFile(
    path.join(root, "data/lexicon/quran-words.json"),
    `${JSON.stringify({
      source: "quran-words.com",
      sourceLabel: "تفسير كلمات القرآن الكريم — التفسير الاشتقاقي",
      sourceUrl: "https://www.quran-words.com",
      entryCount: Object.keys(lexiconEntries).length,
      entries: lexiconEntries,
    })}\n`,
    "utf8",
  );

  const senseFiles = (await readdir(sensesOut)).filter((f) =>
    /^\d+\.json$/.test(f),
  );
  await writeFile(
    path.join(sensesOut, "_import-report.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: "tafseer-json-import",
        from: path.resolve(from),
        fillMissingOnly,
        surahFiles: senseFiles.length,
        totalMatched,
        totalWords,
        matchPct: totalWords
          ? Number(((100 * totalMatched) / totalWords).toFixed(2))
          : 0,
        lexiconEntries: Object.keys(lexiconEntries).length,
        surahReports: reports,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.log({
    surahFiles: senseFiles.length,
    totalMatched,
    totalWords,
    pct: totalWords ? ((100 * totalMatched) / totalWords).toFixed(2) : 0,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
