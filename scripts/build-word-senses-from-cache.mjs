/**
 * Build data/word-senses + lexicon from .cache/quran-words tables
 * (no network). Useful after a partial fetch or rate-limit.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  alignSurahWords,
  assignAyahNumbers,
  isAyahRow,
  stripEtymologyHeading,
} from "./lib/quran-words-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const cache = path.join(root, ".cache", "quran-words");

function lemmaFromUrl(url) {
  try {
    return decodeURIComponent(url || "").match(/\/كلمة\/([^/]+)\//)?.[1] || null;
  } catch {
    return null;
  }
}

function keyFromEtymology(etymology, lemma, rootHint) {
  if (rootHint) return rootHint;
  if (etymology) {
    const m = etymology.match(/^([^\s:：]{1,12})\s*[:：]/);
    if (m) return m[1];
  }
  return lemma;
}

async function main() {
  const dirs = (await readdir(cache))
    .filter((d) => /^\d{3}-/.test(d))
    .sort();
  let lexiconEntries = {};
  try {
    lexiconEntries = JSON.parse(
      await readFile(path.join(root, "data/lexicon/quran-words.json"), "utf8"),
    ).entries;
  } catch {
    /* empty */
  }
  let lemmaDetails = {};
  try {
    lemmaDetails = JSON.parse(
      await readFile(path.join(cache, "_lemma-details.json"), "utf8"),
    );
  } catch {
    /* empty */
  }

  const sensesOut = path.join(root, "data", "word-senses");
  await mkdir(sensesOut, { recursive: true });
  await mkdir(path.join(root, "data", "lexicon"), { recursive: true });

  let totalMatched = 0;
  let totalWords = 0;
  let surahs = 0;
  const reports = [];

  for (const dir of dirs) {
    const sid = Number(dir.slice(0, 3));
    const folder = path.join(cache, dir);
    const files = await readdir(folder);
    const full = files.find((f) => f.startsWith("سورة-") && f.endsWith(".json"));
    let rowsRaw;
    let sourceUrl = null;

    if (full) {
      const payload = JSON.parse(await readFile(path.join(folder, full), "utf8"));
      sourceUrl = payload.meta?.source ?? null;
      rowsRaw = payload.rows.map((row) => {
        const url = row[4] || "";
        const lemma = lemmaFromUrl(url);
        const detail = lemma ? lemmaDetails[lemma] : null;
        const etymology = stripEtymologyHeading(
          row[7] || detail?.etymology || "",
        );
        const key = keyFromEtymology(etymology, lemma, detail?.root);
        if (key && etymology && !lexiconEntries[key]) {
          lexiconEntries[key] = { text: etymology, url, lemma };
        }
        return {
          word: row[1],
          url,
          title: "",
          sense: row[6] || row[2],
          etymology,
          lexiconKey: key,
          quality: row[12] || "structured",
          lemma,
        };
      });
    } else if (files.includes("_table.json")) {
      const payload = JSON.parse(
        await readFile(path.join(folder, "_table.json"), "utf8"),
      );
      sourceUrl = payload.pageUrl ?? null;
      rowsRaw = payload.rows.map((r) => {
        const lemma = lemmaFromUrl(r.url);
        const detail = lemma ? lemmaDetails[lemma] : null;
        const etymology = stripEtymologyHeading(detail?.etymology || "");
        const key = keyFromEtymology(etymology, lemma, detail?.root);
        if (key && etymology && !lexiconEntries[key]) {
          lexiconEntries[key] = { text: etymology, url: r.url, lemma };
        }
        return {
          word: r.word,
          url: r.url,
          title: "",
          sense: r.sense,
          etymology,
          lexiconKey: key,
          quality: "table",
          lemma,
        };
      });
    } else {
      continue;
    }

    const withAyah = assignAyahNumbers(rowsRaw).filter(
      (r) => !isAyahRow(r.word, r.url),
    );
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
      qwWords: withAyah,
    });
    totalMatched += report.matched;
    reports.push(report);
    surahs += 1;

    const words = {};
    for (const a of aligned) {
      if (!a.sense && !a.lexiconKey) continue;
      words[a.wordId] = {
        sense: a.sense || null,
        lexiconKey: a.lexiconKey,
        url: a.url,
      };
    }
    await writeFile(
      path.join(sensesOut, `${sid}.json`),
      `${JSON.stringify({
        id: sid,
        source: "quran-words.com",
        sourceLabel: "تفسير كلمات القرآن الكريم (quran-words.com)",
        sourceUrl,
        wordCount: Object.keys(words).length,
        words,
      })}\n`,
      "utf8",
    );
    console.log(`surah ${sid}: ${report.matched}/${arabyaWords.length}`);
  }

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
  await writeFile(
    path.join(sensesOut, "_import-report.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: "cache-build",
        surahs,
        totalMatched,
        totalWords,
        lexiconEntries: Object.keys(lexiconEntries).length,
        matchPct: totalWords
          ? Number(((100 * totalMatched) / totalWords).toFixed(2))
          : 0,
        surahReports: reports,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.log({
    surahs,
    totalMatched,
    totalWords,
    pct: totalWords ? ((100 * totalMatched) / totalWords).toFixed(2) : 0,
    lexicon: Object.keys(lexiconEntries).length,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
