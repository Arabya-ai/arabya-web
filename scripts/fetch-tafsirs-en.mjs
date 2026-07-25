/**
 * Fetches open English tafsirs per surah into /data/tafsirs/{slug}/{id}.json
 * Quran.com API v4 English resources:
 *   169 Ibn Kathir (Abridged), 168 Ma'arif al-Qur'an, 817 Tazkirul Quran
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outRoot = path.join(root, "data", "tafsirs");
const indexPath = path.join(outRoot, "index.json");

const EN_TAFSIRS = [
  {
    id: 169,
    slug: "en-ibn-kathir",
    nameAr: "تفسير ابن كثير (مختصر إنجليزي)",
    nameEn: "Ibn Kathir (Abridged)",
  },
  {
    id: 168,
    slug: "en-maarif-ul-quran",
    nameAr: "معارف القرآن",
    nameEn: "Ma'arif al-Qur'an",
  },
  {
    id: 817,
    slug: "en-tazkirul-quran",
    nameAr: "تذكير القرآن",
    nameEn: "Tazkirul Quran",
  },
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

async function mergeIndex() {
  let existing = { sources: [] };
  try {
    existing = JSON.parse(await readFile(indexPath, "utf8"));
  } catch {
    /* fresh */
  }
  const bySlug = new Map(
    (existing.sources ?? []).map((s) => [s.slug, { ...s, lang: s.lang || "ar" }]),
  );

  // Ensure Arabic sources keep lang
  for (const [slug, s] of bySlug) {
    if (!s.lang) s.lang = "ar";
    if (!s.nameEn && s.nameAr) s.nameEn = s.nameAr;
    bySlug.set(slug, s);
  }

  for (const t of EN_TAFSIRS) {
    bySlug.set(t.slug, {
      slug: t.slug,
      nameAr: t.nameAr,
      nameEn: t.nameEn,
      lang: "en",
      resourceId: t.id,
      api: "https://api.quran.com",
      source: "Quran.com",
      sourceUrl: "https://api.quran.com",
    });
  }

  const sources = [...bySlug.values()];
  await writeFile(indexPath, JSON.stringify({ sources }, null, 2), "utf8");
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

  for (const t of EN_TAFSIRS) {
    await mkdir(path.join(outRoot, t.slug), { recursive: true });
  }

  await mergeIndex();

  for (const chapterId of chapters) {
    for (const t of EN_TAFSIRS) {
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
              nameEn: t.nameEn,
              lang: "en",
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

  console.log("Done English tafsirs");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
