/**
 * Fetches open Arabic tafsirs per surah into /data/tafsirs/{slug}/{id}.json
 * Sources via Quran.com API v4 (Arabic): Al-Sa'di (91), Muyassar (16), Ibn Kathir (14)
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outRoot = path.join(root, "data", "tafsirs");

const TAFSIRS = [
  { id: 91, slug: "sadi", nameAr: "تفسير السعدي" },
  { id: 16, slug: "muyassar", nameAr: "التفسير الميسر" },
  { id: 14, slug: "ibn-kathir", nameAr: "تفسير ابن كثير" },
  { id: 90, slug: "qurtubi", nameAr: "تفسير القرطبي" },
  { id: 94, slug: "baghawi", nameAr: "تفسير البغوي" },
];

function stripHtml(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "arabya-web-tafsir-fetcher",
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fetchChapterTafsir(tafsirId, chapterId) {
  const verses = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url =
      `https://api.quran.com/api/v4/tafsirs/${tafsirId}/by_chapter/${chapterId}` +
      `?per_page=50&page=${page}`;
    const data = await fetchJson(url);
    totalPages = data.pagination?.total_pages ?? 1;
    for (const item of data.tafsirs ?? []) {
      verses.push({
        verseKey: item.verse_key,
        verseNumber: Number(String(item.verse_key).split(":")[1]),
        text: stripHtml(item.text),
      });
    }
    page += 1;
    await new Promise((r) => setTimeout(r, 80));
  }

  verses.sort((a, b) => a.verseNumber - b.verseNumber);
  return verses;
}

async function main() {
  const only = process.argv
    .slice(2)
    .filter((a) => /^\d+$/.test(a))
    .map(Number);
  const chapters =
    only.length > 0
      ? only
      : Array.from({ length: 114 }, (_, i) => i + 1);

  for (const t of TAFSIRS) {
    await mkdir(path.join(outRoot, t.slug), { recursive: true });
  }

  await writeFile(
    path.join(outRoot, "index.json"),
    JSON.stringify(
      {
        sources: TAFSIRS.map((t) => ({
          slug: t.slug,
          nameAr: t.nameAr,
          resourceId: t.id,
          api: "https://api.quran.com",
        })),
      },
      null,
      2,
    ),
    "utf8",
  );

  for (const chapterId of chapters) {
    for (const t of TAFSIRS) {
      process.stdout.write(`tafsir ${t.slug} surah ${chapterId}… `);
      try {
        const verses = await fetchChapterTafsir(t.id, chapterId);
        await writeFile(
          path.join(outRoot, t.slug, `${chapterId}.json`),
          JSON.stringify(
            {
              id: chapterId,
              slug: t.slug,
              nameAr: t.nameAr,
              verses,
            },
            null,
            0,
          ),
          "utf8",
        );
        console.log(`${verses.length} ayahs`);
      } catch (err) {
        console.log("ERROR", err.message);
      }
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  console.log("Done tafsirs");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
