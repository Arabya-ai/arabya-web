/**
 * Fetches open translation sources from Quran.com API v4:
 * - Word-by-word: English (existing), Indonesian, Urdu
 * - Verse-level: Saheeh International, Muhammad Hamidullah (FR), Junagarhi (UR)
 *
 * Note: No open Arabic word-by-word gloss dataset is available from Quran.com
 * (language=ar falls back to English). Arabic meanings remain a future item
 * when a properly licensed source appears.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");
const surahDir = path.join(dataDir, "surahs");
const transDir = path.join(dataDir, "translations");

/** Verse-level translation editions (Quran.com resource ids) */
const VERSE_EDITIONS = [
  {
    slug: "saheeh-en",
    resourceId: 20,
    nameAr: "صحيح إنترناشونال (إنجليزي)",
    nameEn: "Saheeh International",
    lang: "en",
  },
  {
    slug: "hamidullah-fr",
    resourceId: 31,
    nameAr: "حميد الله (فرنسي)",
    nameEn: "Muhammad Hamidullah",
    lang: "fr",
  },
  {
    slug: "junagarhi-ur",
    resourceId: 54,
    nameAr: "جوناغري (أردو)",
    nameEn: "Maulana Muhammad Junagarhi",
    lang: "ur",
  },
];

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "arabya-web-translations",
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWbwLang(chapterId, language) {
  /** @type {Map<string, string>} */
  const map = new Map();
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url =
      `https://api.quran.com/api/v4/verses/by_chapter/${chapterId}` +
      `?language=${language}&words=true&word_fields=translation` +
      `&per_page=50&page=${page}`;
    const data = await fetchJson(url);
    totalPages = data.pagination?.total_pages ?? 1;

    for (const v of data.verses ?? []) {
      for (const w of v.words ?? []) {
        if (w.char_type_name !== "word") continue;
        map.set(
          `${v.verse_number}:${w.position}`,
          w.translation?.text ?? "",
        );
      }
    }
    page += 1;
    await sleep(40);
  }
  return map;
}

async function fetchVerseTranslation(chapterId, resourceId) {
  const verses = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url =
      `https://api.quran.com/api/v4/verses/by_chapter/${chapterId}` +
      `?translations=${resourceId}&per_page=50&page=${page}&words=false`;
    const data = await fetchJson(url);
    totalPages = data.pagination?.total_pages ?? 1;

    for (const v of data.verses ?? []) {
      const t = v.translations?.[0];
      const text = String(t?.text ?? "")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      verses.push({
        verseNumber: v.verse_number,
        verseKey: v.verse_key,
        text,
      });
    }
    page += 1;
    await sleep(40);
  }
  return verses;
}

async function enrichSurahWbw(chapterId) {
  const file = path.join(surahDir, `${chapterId}.json`);
  const surah = JSON.parse(await readFile(file, "utf8"));

  const [idMap, urMap] = await Promise.all([
    fetchWbwLang(chapterId, "id"),
    fetchWbwLang(chapterId, "ur"),
  ]);

  for (const verse of surah.verses) {
    for (const word of verse.words) {
      const key = `${verse.verseNumber}:${word.position}`;
      word.meaningId = idMap.get(key) || word.meaningId || "";
      word.meaningUr = urMap.get(key) || word.meaningUr || "";
      // keep meaning as English WBW
    }
  }

  await writeFile(file, JSON.stringify(surah, null, 0), "utf8");
}

async function main() {
  await mkdir(transDir, { recursive: true });

  const only = process.argv.slice(2).map(Number).filter(Boolean);
  const chapters = only.length
    ? only
    : Array.from({ length: 114 }, (_, i) => i + 1);

  console.log("Enriching word-by-word (id + ur) for", chapters.length, "surahs…");
  for (const id of chapters) {
    process.stdout.write(`wbw ${id}… `);
    await enrichSurahWbw(id);
    console.log("ok");
  }

  for (const ed of VERSE_EDITIONS) {
    const edDir = path.join(transDir, ed.slug);
    await mkdir(edDir, { recursive: true });
    console.log(`Fetching verse translation ${ed.slug}…`);
    for (const id of chapters) {
      const verses = await fetchVerseTranslation(id, ed.resourceId);
      await writeFile(
        path.join(edDir, `${id}.json`),
        JSON.stringify(
          {
            id,
            slug: ed.slug,
            resourceId: ed.resourceId,
            nameAr: ed.nameAr,
            nameEn: ed.nameEn,
            lang: ed.lang,
            source: "Quran.com API v4",
            sourceUrl: "https://quran.com",
            verses,
          },
          null,
          0,
        ),
        "utf8",
      );
      process.stdout.write(`  ${ed.slug} ${id}\n`);
    }
  }

  await writeFile(
    path.join(transDir, "index.json"),
    JSON.stringify(
      {
        wordByWord: [
          {
            field: "meaning",
            lang: "en",
            nameAr: "إنجليزي",
            source: "Quran.com WBW",
          },
          {
            field: "meaningId",
            lang: "id",
            nameAr: "إندونيسي",
            source: "Quran.com WBW",
          },
          {
            field: "meaningUr",
            lang: "ur",
            nameAr: "أردو",
            source: "Quran.com WBW",
          },
        ],
        verseEditions: VERSE_EDITIONS.map((e) => ({
          slug: e.slug,
          resourceId: e.resourceId,
          nameAr: e.nameAr,
          nameEn: e.nameEn,
          lang: e.lang,
        })),
        arabicWbwNote:
          "No open Arabic word-by-word meaning dataset is currently available via Quran.com or other GPL/CC sources suitable for redistribution. English/Indonesian/Urdu WBW are included instead.",
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log("Done translations.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
