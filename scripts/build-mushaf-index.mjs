/**
 * Builds mushaf page index (604 pages) and patches /data/surahs/*.json with page numbers.
 * Source: Quran.com API v4 (page_number on each verse).
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");
const surahDir = path.join(dataDir, "surahs");

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "arabya-web-data-fetcher" },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fetchChapterVersePages(chapterId) {
  const rows = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url =
      `https://api.quran.com/api/v4/verses/by_chapter/${chapterId}` +
      `?language=en&per_page=50&page=${page}`;
    const data = await fetchJson(url);
    totalPages = data.pagination?.total_pages ?? 1;

    for (const v of data.verses ?? []) {
      rows.push({
        surahId: chapterId,
        verseNumber: v.verse_number,
        verseKey: v.verse_key,
        page: v.page_number,
        juz: v.juz_number,
      });
    }
    page += 1;
  }

  return rows;
}

async function main() {
  const pages = {};
  const surahFirstPage = {};
  const surahPages = {};

  for (let chapterId = 1; chapterId <= 114; chapterId += 1) {
    process.stdout.write(`Chapter ${chapterId}… `);
    const rows = await fetchChapterVersePages(chapterId);
    console.log(`${rows.length} verses`);

    const filePath = path.join(surahDir, `${chapterId}.json`);
    const raw = await readFile(filePath, "utf8");
    const surah = JSON.parse(raw);
    const pageByVerse = new Map(rows.map((r) => [r.verseNumber, r.page]));

    for (const verse of surah.verses) {
      const mushafPage = pageByVerse.get(verse.verseNumber);
      if (mushafPage) verse.page = mushafPage;
    }

    await writeFile(filePath, JSON.stringify(surah), "utf8");

    const uniquePages = [...new Set(rows.map((r) => r.page))].sort((a, b) => a - b);
    surahFirstPage[String(chapterId)] = uniquePages[0];
    surahPages[String(chapterId)] = uniquePages;

    for (const row of rows) {
      const key = String(row.page);
      if (!pages[key]) pages[key] = [];
      pages[key].push({
        surahId: row.surahId,
        verseNumber: row.verseNumber,
        verseKey: row.verseKey,
        juz: row.juz,
      });
    }

    await new Promise((r) => setTimeout(r, 80));
  }

  const payload = {
    totalPages: 604,
    surahFirstPage,
    surahPages,
    pages,
  };

  await writeFile(
    path.join(dataDir, "mushaf-index.json"),
    JSON.stringify(payload),
    "utf8",
  );

  const pageCount = Object.keys(pages).length;
  console.log(`Done. ${pageCount} mushaf pages indexed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
