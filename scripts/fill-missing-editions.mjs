/**
 * One-shot: fetch only new editions (indonesian, turkish, qurtubi, baghawi).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const TAFSIRS = [
  { id: 90, slug: "qurtubi", nameAr: "تفسير القرطبي" },
  { id: 94, slug: "baghawi", nameAr: "تفسير البغوي" },
];

const EDITIONS = [
  {
    slug: "indonesian",
    resourceId: 33,
    nameAr: "الإندونيسية",
    nameEn: "Indonesian Ministry of Religious Affairs",
    lang: "id",
  },
  {
    slug: "turkish",
    resourceId: 77,
    nameAr: "التركية — ديانت",
    nameEn: "Turkish (Diyanet)",
    lang: "tr",
  },
];

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "arabya-web-fill-missing",
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function fetchTafsir(tafsirId, chapterId) {
  const verses = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const data = await fetchJson(
      `https://api.quran.com/api/v4/tafsirs/${tafsirId}/by_chapter/${chapterId}?per_page=50&page=${page}`,
    );
    totalPages = data.pagination?.total_pages || 1;
    for (const t of data.tafsirs || []) {
      const vn = Number(String(t.verse_key || "").split(":")[1]);
      verses.push({
        verseKey: t.verse_key,
        verseNumber: vn,
        text: stripHtml(t.text),
      });
    }
    page += 1;
  }
  verses.sort((a, b) => a.verseNumber - b.verseNumber);
  return verses;
}

async function fetchVerse(chapterId, resourceId) {
  const data = await fetchJson(
    `https://api.quran.com/api/v4/quran/translations/${resourceId}?chapter_number=${chapterId}`,
  );
  return (data.translations || []).map((t, i) => ({
    verseNumber: i + 1,
    verseKey: `${chapterId}:${i + 1}`,
    text: stripHtml(t.text),
  }));
}

async function main() {
  for (const ed of EDITIONS) {
    const dir = path.join(root, "data", "translations", ed.slug);
    await mkdir(dir, { recursive: true });
    for (let id = 1; id <= 114; id += 1) {
      const verses = await fetchVerse(id, ed.resourceId);
      await writeFile(
        path.join(dir, `${id}.json`),
        JSON.stringify({
          id,
          slug: ed.slug,
          resourceId: ed.resourceId,
          nameAr: ed.nameAr,
          nameEn: ed.nameEn,
          lang: ed.lang,
          source: "Quran.com API v4",
          sourceUrl: "https://quran.com",
          verses,
        }),
      );
      if (id % 20 === 0 || id === 114) console.log(ed.slug, id);
    }
  }

  for (const t of TAFSIRS) {
    const dir = path.join(root, "data", "tafsirs", t.slug);
    await mkdir(dir, { recursive: true });
    for (let id = 1; id <= 114; id += 1) {
      process.stdout.write(`${t.slug} ${id}\n`);
      const verses = await fetchTafsir(t.id, id);
      await writeFile(
        path.join(dir, `${id}.json`),
        JSON.stringify({
          id,
          slug: t.slug,
          nameAr: t.nameAr,
          verses,
        }),
      );
    }
  }

  console.log("DONE");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
