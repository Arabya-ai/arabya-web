#!/usr/bin/env node
/**
 * Import full Arabic hadith editions from fawazahmed0/hadith-api (OSS list item).
 * Source: https://github.com/fawazahmed0/hadith-api (branch 1 / CDN)
 *
 * Run: node scripts/import-hadith-oss.mjs
 *
 * Writes:
 *   data/hadith/index.json
 *   data/hadith/collections/<slug>.json
 *   data/hadith/search-index.json
 *   data/hadith/SOURCES.md
 */
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), "data", "hadith");
const COL_DIR = path.join(ROOT, "collections");
const EDITIONS_URL =
  "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions.min.json";
const RAW_FALLBACK = (edition) =>
  `https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/${edition}.min.json`;
const CDN = (edition) =>
  `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${edition}.min.json`;

const TITLES = {
  bukhari: { ar: "صحيح البخاري", en: "Sahih al-Bukhari" },
  muslim: { ar: "صحيح مسلم", en: "Sahih Muslim" },
  abudawud: { ar: "سنن أبي داود", en: "Sunan Abu Dawud" },
  tirmidhi: { ar: "جامع الترمذي", en: "Jamiʿ at-Tirmidhi" },
  nasai: { ar: "سنن النسائي", en: "Sunan an-Nasaʾi" },
  ibnmajah: { ar: "سنن ابن ماجه", en: "Sunan Ibn Majah" },
  malik: { ar: "موطأ مالك", en: "Muwatta Malik" },
  nawawi: { ar: "الأربعون النووية", en: "Nawawi Forty" },
  qudsi: { ar: "الأحاديث القدسية", en: "Hadith Qudsi" },
  dehlawi: { ar: "بلوغ المرام / دهلوى", en: "Dehlawi" },
};

async function fetchJson(url, fallback) {
  for (const u of [url, fallback].filter(Boolean)) {
    try {
      const res = await fetch(u, {
        headers: { Accept: "application/json", "User-Agent": "arabya-web-import" },
      });
      if (!res.ok) continue;
      return await res.json();
    } catch {
      /* try next */
    }
  }
  throw new Error(`Failed to fetch ${url}`);
}

function pickArabicEdition(collectionEntries) {
  // Prefer ara-<book> with diacritics (not ara-<book>1 stripped).
  const ara = collectionEntries.filter(
    (c) =>
      c.language === "Arabic" &&
      typeof c.name === "string" &&
      c.name.startsWith("ara-") &&
      !/1$/.test(c.name),
  );
  if (ara.length) return ara[0];
  return collectionEntries.find(
    (c) => c.language === "Arabic" && String(c.name).startsWith("ara-"),
  );
}

function toItems(bookSlug, payload) {
  const hadiths = payload?.hadiths ?? [];
  const sectionMap = payload?.metadata?.sections ?? {};
  return hadiths.map((h) => {
    const number = Number(h.hadithnumber ?? h.number ?? 0);
    const sectionNum = h.reference?.book ?? h.reference?.section;
    const chapterEn =
      sectionNum != null && sectionMap[String(sectionNum)]
        ? String(sectionMap[String(sectionNum)])
        : undefined;
    return {
      id: `H:${bookSlug}:${number}`,
      number,
      arabic: String(h.text || "").trim(),
      grade: Array.isArray(h.grades)
        ? h.grades.map((g) => g.name || g).filter(Boolean).join(" · ") ||
          undefined
        : undefined,
      chapterAr: chapterEn,
      chapterEn,
    };
  }).filter((i) => i.number > 0 && i.arabic);
}

async function main() {
  await fs.mkdir(COL_DIR, { recursive: true });
  console.log("Fetching editions catalog…");
  const editions = await fetchJson(EDITIONS_URL);

  const collectionsMeta = [];
  const searchRows = [];

  for (const [bookSlug, meta] of Object.entries(editions)) {
    const list = meta?.collection ?? [];
    const edition = pickArabicEdition(list);
    if (!edition) {
      console.warn(`skip ${bookSlug}: no Arabic edition`);
      continue;
    }
    const editionName = edition.name;
    console.log(`Downloading ${editionName}…`);
    const payload = await fetchJson(CDN(editionName), RAW_FALLBACK(editionName));
    const items = toItems(bookSlug, payload);
    const titles = TITLES[bookSlug] || {
      ar: meta.name || bookSlug,
      en: meta.name || bookSlug,
    };

    const collection = {
      slug: bookSlug,
      titleAr: titles.ar,
      titleEn: titles.en,
      descriptionAr: `متن عربي كامل مستورد من fawazahmed0/hadith-api (${editionName}).`,
      descriptionEn: `Full Arabic matn imported from fawazahmed0/hadith-api (${editionName}).`,
      source: "fawazahmed0/hadith-api",
      license: "see upstream hadith-api README / sunnah.com attribution",
      edition: editionName,
      sourceUrl: edition.linkmin || edition.link,
      itemCount: items.length,
      items,
    };

    await fs.writeFile(
      path.join(COL_DIR, `${bookSlug}.json`),
      JSON.stringify(collection),
      "utf8",
    );

    collectionsMeta.push({
      slug: bookSlug,
      titleAr: titles.ar,
      titleEn: titles.en,
      descriptionAr: collection.descriptionAr,
      descriptionEn: collection.descriptionEn,
      itemCount: items.length,
    });

    for (const item of items) {
      searchRows.push({
        id: item.id,
        collection: bookSlug,
        number: item.number,
        arabic: item.arabic,
        titleAr: titles.ar,
        titleEn: titles.en,
        href: `/hadith/${bookSlug}/${item.number}`,
      });
    }

    console.log(`  → ${items.length} hadiths`);
  }

  collectionsMeta.sort((a, b) => (b.itemCount || 0) - (a.itemCount || 0));

  await fs.writeFile(
    path.join(ROOT, "index.json"),
    JSON.stringify(
      {
        updatedAt: new Date().toISOString().slice(0, 10),
        sourceNote:
          "Full Arabic editions from fawazahmed0/hadith-api (awesome-islamic list). Git-first under data/hadith.",
        importedFrom: [
          {
            project: "fawazahmed0/hadith-api",
            url: "https://github.com/fawazahmed0/hadith-api",
            listId: 245,
          },
        ],
        collections: collectionsMeta,
      },
      null,
      2,
    ),
    "utf8",
  );

  await fs.writeFile(
    path.join(ROOT, "search-index.json"),
    JSON.stringify({
      updatedAt: new Date().toISOString().slice(0, 10),
      count: searchRows.length,
      items: searchRows,
    }),
    "utf8",
  );

  await fs.writeFile(
    path.join(ROOT, "SOURCES.md"),
    `# مصادر بيانات الحديث

| مشروع (قائمة الـ320) | الاستخدام |
|---|---|
| [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api) | متون عربية كاملة لكل المجموعات أدناه |
| sunnah.com/api · gadingnst/hadith-api · Open-Hadith-Data · hadith-json | مراجع بنية/ترخيص — الاستيراد الأساسي عبر hadith-api CDN |

المجموعات المستوردة: ${collectionsMeta.map((c) => `${c.slug} (${c.itemCount})`).join(" · ")}

آخر تشغيل: ${new Date().toISOString()}
`,
    "utf8",
  );

  const total = collectionsMeta.reduce((n, c) => n + (c.itemCount || 0), 0);
  console.log(`Done. ${collectionsMeta.length} collections, ${total} hadiths.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
