#!/usr/bin/env node
/**
 * Import additional collections from mhashim6/Open-Hadith-Data (CSV).
 * Adds books not already covered by fawazahmed0/hadith-api (e.g. Musnad Ahmad, Darimi).
 *
 * Run: node scripts/import-open-hadith-data.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), "data", "hadith");
const COL_DIR = path.join(ROOT, "collections");

const SOURCES = [
  {
    slug: "ahmad",
    titleAr: "مسند أحمد",
    titleEn: "Musnad Ahmad",
    url: "https://raw.githubusercontent.com/mhashim6/Open-Hadith-Data/master/Musnad_Ahmad_Ibn-Hanbal/musnad_ahmad_ibn-hanbal_ahadith.utf8.csv",
  },
  {
    slug: "darimi",
    titleAr: "سنن الدارمي",
    titleEn: "Sunan al-Darimi",
    url: "https://raw.githubusercontent.com/mhashim6/Open-Hadith-Data/master/Sunan_Al-Darimi/sunan_al-darimi_ahadith.utf8.csv",
  },
];

function normalizeArabicSearch(input) {
  return String(input || "")
    .normalize("NFKD")
    .replace(/\u0670/g, "ا")
    .replace(/\u06E5/g, "و")
    .replace(/[\u06E6\u06E7]/g, "ي")
    .replace(
      /[\u064B-\u065F\u06D6-\u06ED\u0640\u06DE-\u06E4\u06E8-\u06ED\u0610-\u061A\u08F0-\u08FF]/g,
      "",
    )
    .replace(/[ٱأإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0621-\u064A0-9:\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse OHD lines: "num","text..." (text may contain commas; quotes rarely escaped). */
function parseOhdCsv(text) {
  const items = [];
  const re = /^"(\d+)",\s*"(.*)"\s*$/s;
  // Split on newlines that start a new numbered record
  const chunks = text.split(/\n(?="\d+",)/);
  for (const chunk of chunks) {
    const line = chunk.trim();
    if (!line) continue;
    const m = line.match(/^"(\d+)",\s*"(.*)"\s*$/s);
    if (!m) {
      // fallback: first comma after opening quote number
      const m2 = line.match(/^"(\d+)","([\s\S]*)"\s*$/);
      if (!m2) continue;
      items.push({
        number: Number(m2[1]),
        arabic: m2[2].replace(/\s+/g, " ").trim(),
      });
      continue;
    }
    items.push({
      number: Number(m[1]),
      arabic: m[2].replace(/\s+/g, " ").trim(),
    });
  }
  return items.filter((i) => i.number > 0 && i.arabic.length > 5);
}

async function rebuildSearchIndex(index) {
  const searchRows = [];
  for (const meta of index.collections) {
    const col = JSON.parse(
      await fs.readFile(path.join(COL_DIR, `${meta.slug}.json`), "utf8"),
    );
    for (const item of col.items) {
      const arabic = item.arabic || "";
      searchRows.push({
        id: item.id,
        collection: meta.slug,
        number: item.number,
        titleAr: meta.titleAr,
        titleEn: meta.titleEn,
        href: `/hadith/${meta.slug}/${item.number}`,
        norm: normalizeArabicSearch(arabic),
      });
    }
  }
  await fs.writeFile(
    path.join(ROOT, "search-index.json"),
    JSON.stringify({
      updatedAt: new Date().toISOString().slice(0, 10),
      count: searchRows.length,
      items: searchRows,
    }),
  );
  return searchRows.length;
}

async function main() {
  await fs.mkdir(COL_DIR, { recursive: true });
  const index = JSON.parse(
    await fs.readFile(path.join(ROOT, "index.json"), "utf8"),
  );
  const bySlug = new Map(
    (index.collections || []).map((c) => [c.slug, c]),
  );

  for (const src of SOURCES) {
    console.log(`Fetching ${src.slug}…`);
    const res = await fetch(src.url, {
      headers: { "User-Agent": "arabya-web-import" },
    });
    if (!res.ok) throw new Error(`${res.status} ${src.url}`);
    const csv = await res.text();
    const parsed = parseOhdCsv(csv);
    console.log(`  parsed ${parsed.length}`);
    const items = parsed.map((row) => ({
      id: `H:${src.slug}:${row.number}`,
      number: row.number,
      arabic: row.arabic,
    }));
    const collection = {
      slug: src.slug,
      titleAr: src.titleAr,
      titleEn: src.titleEn,
      descriptionAr: `متن عربي مستورد من Open-Hadith-Data (${src.slug}).`,
      descriptionEn: `Arabic matn imported from Open-Hadith-Data (${src.slug}).`,
      source: "mhashim6/Open-Hadith-Data",
      license: "see upstream Open-Hadith-Data LICENSE",
      sourceUrl: src.url,
      itemCount: items.length,
      items,
    };
    await fs.writeFile(
      path.join(COL_DIR, `${src.slug}.json`),
      JSON.stringify(collection),
    );
    bySlug.set(src.slug, {
      slug: src.slug,
      titleAr: src.titleAr,
      titleEn: src.titleEn,
      descriptionAr: collection.descriptionAr,
      descriptionEn: collection.descriptionEn,
      itemCount: items.length,
    });
  }

  index.updatedAt = new Date().toISOString().slice(0, 10);
  index.importedFrom = [
    ...(index.importedFrom || []),
    {
      project: "mhashim6/Open-Hadith-Data",
      url: "https://github.com/mhashim6/Open-Hadith-Data",
      listId: 246,
    },
  ];
  // dedupe importedFrom by project
  const seen = new Set();
  index.importedFrom = index.importedFrom.filter((x) => {
    if (seen.has(x.project)) return false;
    seen.add(x.project);
    return true;
  });
  index.collections = [...bySlug.values()].sort(
    (a, b) => (b.itemCount || 0) - (a.itemCount || 0),
  );
  await fs.writeFile(
    path.join(ROOT, "index.json"),
    JSON.stringify(index, null, 2),
  );

  const n = await rebuildSearchIndex(index);
  console.log(`Done. search-index rows=${n} collections=${index.collections.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
