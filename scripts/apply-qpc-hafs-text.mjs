/**
 * Rewrites word.text in data/surahs/*.json to text_qpc_hafs encoding,
 * which renders correctly in UthmanicHafs (fixes U+06DF dotted-circle artifacts).
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const surahDir = path.join(root, "data", "surahs");

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "arabya-web-data-fetcher" },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fetchChapterQpcWords(chapterId) {
  const words = new Map();
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url =
      `https://api.quran.com/api/v4/verses/by_chapter/${chapterId}` +
      `?language=en&words=true&word_fields=text_qpc_hafs&per_page=50&page=${page}`;
    const data = await fetchJson(url);
    totalPages = data.pagination?.total_pages ?? 1;

    for (const verse of data.verses ?? []) {
      for (const word of verse.words ?? []) {
        words.set(`${verse.verse_number}:${word.position}`, word.text_qpc_hafs ?? word.text);
      }
    }
    page += 1;
  }

  return words;
}

async function main() {
  let updated = 0;
  let missing = 0;

  for (let id = 1; id <= 114; id += 1) {
    const file = path.join(surahDir, `${id}.json`);
    const raw = await readFile(file, "utf8");
    const surah = JSON.parse(raw);
    const qpcWords = await fetchChapterQpcWords(id);

    for (const verse of surah.verses) {
      for (const word of verse.words) {
        const key = `${verse.verseNumber}:${word.position}`;
        const qpc = qpcWords.get(key);
        if (!qpc) {
          missing += 1;
          continue;
        }
        if (word.text !== qpc) {
          word.text = qpc;
          updated += 1;
        }
      }
    }

    await writeFile(file, JSON.stringify(surah));
    process.stderr.write(`surah ${id} done\n`);
  }

  console.log(JSON.stringify({ updated, missing }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
