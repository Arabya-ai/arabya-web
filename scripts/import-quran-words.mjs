/**
 * Import owner scrape from quran-words.com into slim Arabya data files.
 *
 * Usage:
 *   node scripts/import-quran-words.mjs --from=/path/to/quran-words
 *   node scripts/import-quran-words.mjs --from=... --surah=1,2
 *   node scripts/import-quran-words.mjs --from=... --structured-only
 *
 * Expects per-surah folders like `001-الفاتحة/سورة-*.json` with:
 *   { meta, headers, rows: [ [رقم, الكلمة, التفسير, ..., Detail URL, Detail Title,
 *     Short Meaning, Etymology, ..., Detail Quality] ] }
 *
 * Writes:
 *   data/word-senses/{id}.json
 *   data/lexicon/quran-words.json
 *   data/word-senses/_import-report.json
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  alignSurahWords,
  assignAyahNumbers,
  isAyahRow,
  lexiconKeyFromEtymology,
  stripEtymologyHeading,
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

function parseSurahFilter(raw) {
  if (!raw) return null;
  const set = new Set();
  for (const part of raw.split(",")) {
    const n = Number(part.trim());
    if (Number.isInteger(n) && n >= 1 && n <= 114) set.add(n);
  }
  return set.size ? set : null;
}

async function loadArabyaWords(surahId) {
  const raw = await readFile(
    path.join(root, "data", "surahs", `${surahId}.json`),
    "utf8",
  );
  const surah = JSON.parse(raw);
  const words = [];
  for (const verse of surah.verses) {
    for (const w of verse.words) {
      if (w.charType === "end") continue;
      words.push({
        verse: verse.verseNumber,
        position: w.position,
        text: w.text,
      });
    }
  }
  return words;
}

async function findSurahJson(fromDir, surahId) {
  const prefix = String(surahId).padStart(3, "0");
  const dirs = await readdir(fromDir, { withFileTypes: true });
  const dir = dirs.find((d) => d.isDirectory() && d.name.startsWith(prefix));
  if (!dir) return null;
  const folder = path.join(fromDir, dir.name);
  const files = await readdir(folder);
  const json = files.find(
    (f) => f.endsWith(".json") && !f.includes("REVIEW") && !f.includes("report"),
  );
  if (!json) return null;
  return path.join(folder, json);
}

function rowToQwWord(row) {
  const word = String(row[1] ?? "").trim();
  const url = String(row[4] ?? "").trim();
  const title = String(row[5] ?? "").trim();
  const sense = String(row[6] || row[2] || "").trim();
  const etymology = String(row[7] || "").trim();
  const quality = String(row[12] || "").trim() || null;
  const lemma = (() => {
    try {
      const raw = decodeURIComponent(url);
      const m = raw.match(/\/كلمة\/([^/]+)\//);
      return m ? m[1] : null;
    } catch {
      return null;
    }
  })();
  const lexiconKey = etymology
    ? lexiconKeyFromEtymology(etymology, lemma)
    : lemma;
  return {
    word,
    url,
    title,
    sense,
    etymology: stripEtymologyHeading(etymology),
    lexiconKey,
    quality,
    lemma,
  };
}

async function main() {
  const from = arg("from") || process.env.QURAN_WORDS_DIR;
  if (!from) {
    console.error(
      "Usage: node scripts/import-quran-words.mjs --from=/path/to/quran-words [--surah=1,2] [--structured-only]",
    );
    process.exit(1);
  }
  const fromDir = path.resolve(from);
  const surahFilter = parseSurahFilter(arg("surah"));
  const structuredOnly = hasFlag("structured-only");
  const preferredQualities = structuredOnly
    ? new Set(["structured"])
    : null;

  const sensesOut = path.join(root, "data", "word-senses");
  const lexiconOutDir = path.join(root, "data", "lexicon");
  await mkdir(sensesOut, { recursive: true });
  await mkdir(lexiconOutDir, { recursive: true });

  /** @type {Map<string, { text: string, url: string|null, lemma: string|null }>} */
  const lexicon = new Map();
  const reports = [];
  let totalMatched = 0;
  let totalWords = 0;

  for (let sid = 1; sid <= 114; sid++) {
    if (surahFilter && !surahFilter.has(sid)) continue;
    const jsonPath = await findSurahJson(fromDir, sid);
    if (!jsonPath) {
      reports.push({ surahId: sid, error: "missing-json" });
      console.warn(`skip surah ${sid}: missing json`);
      continue;
    }
    const payload = JSON.parse(await readFile(jsonPath, "utf8"));
    const rawRows = (payload.rows || [])
      .map(rowToQwWord)
      .filter((r) => !isAyahRow(r.word, r.url));
    const withAyah = assignAyahNumbers(
      (payload.rows || []).map(rowToQwWord),
      { trustTitleAyah: true },
    ).filter((r) => !isAyahRow(r.word, r.url));

    for (const r of withAyah) {
      if (r.lexiconKey && r.etymology) {
        if (!lexicon.has(r.lexiconKey)) {
          lexicon.set(r.lexiconKey, {
            text: r.etymology,
            url: r.url || null,
            lemma: r.lemma || null,
          });
        }
      }
    }

    const arabyaWords = await loadArabyaWords(sid);
    totalWords += arabyaWords.length;
    const { aligned, report } = alignSurahWords({
      surahId: sid,
      arabyaWords,
      qwWords: withAyah,
      preferredQualities,
    });
    totalMatched += report.matched;
    reports.push({
      ...report,
      sourceRows: rawRows.length,
      sourceUrl: payload.meta?.source ?? null,
    });

    const words = {};
    for (const a of aligned) {
      if (!a.sense && !a.lexiconKey) continue;
      words[a.wordId] = {
        sense: a.sense || null,
        lexiconKey: a.lexiconKey,
        url: a.url,
      };
    }

    const out = {
      id: sid,
      source: "quran-words.com",
      sourceLabel: "تفسير كلمات القرآن الكريم (quran-words.com)",
      sourceUrl:
        payload.meta?.source ??
        `https://www.quran-words.com/سورة/${sid}`,
      wordCount: Object.keys(words).length,
      words,
    };
    await writeFile(
      path.join(sensesOut, `${sid}.json`),
      `${JSON.stringify(out)}\n`,
      "utf8",
    );
    console.log(
      `surah ${sid}: matched ${report.matched}/${arabyaWords.length} (qw ${withAyah.length})`,
    );
  }

  const lexiconObj = {
    source: "quran-words.com",
    sourceLabel: "تفسير كلمات القرآن الكريم — التفسير الاشتقاقي",
    sourceUrl: "https://www.quran-words.com",
    entryCount: lexicon.size,
    entries: Object.fromEntries(
      [...lexicon.entries()].map(([key, v]) => [
        key,
        { text: v.text, url: v.url, lemma: v.lemma },
      ]),
    ),
  };
  await writeFile(
    path.join(lexiconOutDir, "quran-words.json"),
    `${JSON.stringify(lexiconObj)}\n`,
    "utf8",
  );

  const summary = {
    generatedAt: new Date().toISOString(),
    from: fromDir,
    structuredOnly,
    totalArabyaWords: totalWords,
    totalMatched,
    lexiconEntries: lexicon.size,
    surahReports: reports,
  };
  await writeFile(
    path.join(sensesOut, "_import-report.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `done: matched ${totalMatched}/${totalWords}, lexicon ${lexicon.size}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
