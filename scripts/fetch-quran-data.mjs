/**
 * Downloads Quran metadata + word-by-word data into /data (GitHub-friendly JSON).
 * Source: Quran.com API v4 (open data).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");
const surahDir = path.join(dataDir, "surahs");

const SURAH_START_JUZ = [
  0, 1, 1, 3, 4, 6, 7, 8, 9, 10, 11, 11, 12, 13, 13, 14, 14, 15, 15, 16, 16,
  17, 17, 18, 18, 18, 19, 19, 20, 20, 21, 21, 21, 21, 22, 22, 22, 23, 23, 23,
  24, 24, 25, 25, 25, 25, 25, 26, 26, 26, 26, 26, 27, 27, 27, 27, 27, 27, 28,
  28, 28, 28, 28, 28, 28, 28, 28, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29,
  30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
];

const JUZ_LABELS = {
  1: "الجزء الأول",
  2: "الجزء الثاني",
  3: "الجزء الثالث",
  4: "الجزء الرابع",
  5: "الجزء الخامس",
  6: "الجزء السادس",
  7: "الجزء السابع",
  8: "الجزء الثامن",
  9: "الجزء التاسع",
  10: "الجزء العاشر",
  11: "الجزء الحادي عشر",
  12: "الجزء الثاني عشر",
  13: "الجزء الثالث عشر",
  14: "الجزء الرابع عشر",
  15: "الجزء الخامس عشر",
  16: "الجزء السادس عشر",
  17: "الجزء السابع عشر",
  18: "الجزء الثامن عشر",
  19: "الجزء التاسع عشر",
  20: "الجزء العشرون",
  21: "الجزء الحادي والعشرون",
  22: "الجزء الثاني والعشرون",
  23: "الجزء الثالث والعشرون",
  24: "الجزء الرابع والعشرون",
  25: "الجزء الخامس والعشرون",
  26: "الجزء السادس والعشرون",
  27: "الجزء السابع والعشرون",
  28: "الجزء الثامن والعشرون",
  29: "الجزء التاسع والعشرون",
  30: "الجزء الثلاثون",
};

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "arabya-web-data-fetcher" },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fetchChapterVerses(chapterId) {
  const verses = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url =
      `https://api.quran.com/api/v4/verses/by_chapter/${chapterId}` +
      `?language=en&words=true&word_fields=text_qpc_hafs,translation,transliteration` +
      `&per_page=50&page=${page}`;
    const data = await fetchJson(url);
    totalPages = data.pagination?.total_pages ?? 1;

    for (const v of data.verses ?? []) {
      verses.push({
        verseNumber: v.verse_number,
        verseKey: v.verse_key,
        juz: v.juz_number,
        page: v.page_number,
        words: (v.words ?? [])
          .filter((w) => w.char_type_name === "word")
          .map((w) => ({
            position: w.position,
            text: w.text_qpc_hafs || w.text_uthmani || w.text,
            meaning: w.translation?.text ?? "",
            transliteration: w.transliteration?.text ?? "",
            charType: w.char_type_name,
          })),
      });
    }
    page += 1;
  }

  return verses;
}

async function main() {
  await mkdir(surahDir, { recursive: true });

  console.log("Fetching chapters…");
  const chaptersData = await fetchJson(
    "https://api.quran.com/api/v4/chapters?language=ar",
  );

  const surahs = chaptersData.chapters.map((c) => {
    const juz = SURAH_START_JUZ[c.id] ?? 1;
    const place = c.revelation_place === "madinah" ? "madinah" : "makkah";
    return {
      id: c.id,
      nameArabic: c.name_arabic,
      nameSimple: c.name_simple,
      versesCount: c.verses_count,
      revelationPlace: place,
      revelationLabel: place === "makkah" ? "مكيّة" : "مدنيّة",
      juz,
      juzLabel: JUZ_LABELS[juz] ?? `الجزء ${juz}`,
    };
  });

  await writeFile(
    path.join(dataDir, "surahs.json"),
    JSON.stringify(surahs, null, 2),
    "utf8",
  );
  console.log(`Wrote surahs.json (${surahs.length})`);

  for (const surah of surahs) {
    process.stdout.write(`Surah ${surah.id} ${surah.nameArabic}… `);
    const verses = await fetchChapterVerses(surah.id);
    const payload = {
      id: surah.id,
      nameArabic: surah.nameArabic,
      versesCount: surah.versesCount,
      verses,
    };
    await writeFile(
      path.join(surahDir, `${surah.id}.json`),
      JSON.stringify(payload),
      "utf8",
    );
    console.log(`${verses.length} ayahs`);
    await new Promise((r) => setTimeout(r, 120));
  }

  console.log("Done. Data saved under /data");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
