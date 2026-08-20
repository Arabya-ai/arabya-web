#!/usr/bin/env node
/**
 * Expand heritage works from open sources that fit Arabya (poetry/prosody +
 * short historical prose). Keeps git size bounded — curated subsets only.
 *
 * Sources:
 * - ARBML/Ashaar resources/ashaar_arudi.csv (prosody-annotated hemistichs)
 * - rn0x/Historical_Encyclopedia database/history.json (first N events)
 * - Editorial public-domain poet selections (classical Arabic)
 *
 * Deferred (gated/huge): HF classical_arabic_poetry, full Diwan (~500k poems),
 * full Historical Encyclopedia (12MB+) / binbaz fatwa dumps.
 *
 * Run: node scripts/import-heritage-expansion.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), "data", "heritage");
const WORKS = path.join(ROOT, "works");
const ASHAAR_URL =
  "https://raw.githubusercontent.com/ARBML/Ashaar/master/resources/ashaar_arudi.csv";
const HIST_URL =
  "https://raw.githubusercontent.com/rn0x/Historical_Encyclopedia/main/database/history.json";
const BINBAZ_BOOKS_URL =
  "https://raw.githubusercontent.com/rn0x/binbaz_database/main/database/books_ar.json";

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "arabya-web-heritage" },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

function parseSimpleCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  // Columns: ,original_shatr,arudi_style,tafilaat,pattern — first empty key
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // naive split — fields don't contain commas in this file
    const cols = line.split(",");
    if (cols.length < 4) continue;
    rows.push({
      original: cols[1]?.trim() || "",
      arudi: cols[2]?.trim() || "",
      tafilaat: cols[3]?.trim() || "",
      pattern: cols[4]?.trim() || "",
    });
  }
  return rows;
}

function coupletsFromAshaar(rows, limit = 40) {
  const passages = [];
  for (let i = 0; i + 1 < rows.length && passages.length < limit; i += 2) {
    const a = rows[i];
    const b = rows[i + 1];
    if (!a.original || !b.original) continue;
    const n = passages.length + 1;
    passages.push({
      id: `TW:ashaar-arudi:${n}`,
      titleAr: `شطران · ${a.tafilaat.slice(0, 28) || "عروض"}`,
      titleEn: `Couplet · meter sample ${n}`,
      textAr: `${a.original} · ${b.original}`,
      meter: a.tafilaat || null,
    });
  }
  return passages;
}

const PD_POETS = [
  {
    slug: "zuhayr",
    titleAr: "مختارات من زهير بن أبي سلمى",
    titleEn: "Selections from Zuhayr",
    kind: "poetry",
    descriptionAr: "أبيات مشهورة من المعلقات — ملك عام.",
    descriptionEn: "Famous Muʿallaqa lines — public domain.",
    passages: [
      {
        id: "TW:zuhayr:1",
        titleAr: "ومن لا يصانع",
        titleEn: "Who does not flatter",
        textAr:
          "وَمَنْ لا يُصانِعْ في أُمورٍ كَثيرَةٍ · يُضَرَّسْ بِأَنيابٍ وَيوطَأْ بِمَنسِمِ",
        meter: "الطويل",
      },
      {
        id: "TW:zuhayr:2",
        titleAr: "سئمت تكاليف",
        titleEn: "I grew weary of life’s burdens",
        textAr:
          "سَئِمتُ تَكاليفَ الحَياةِ وَمَن يَعِشْ · ثَمانينَ حَولاً لا أَبا لَكَ يَسأَمِ",
        meter: "الطويل",
      },
    ],
  },
  {
    slug: "labid",
    titleAr: "مختارات من لبيد بن ربيعة",
    titleEn: "Selections from Labīd",
    kind: "poetry",
    descriptionAr: "من معلّقة لبيد — نص تعليمي ملك عام.",
    descriptionEn: "From Labīd’s Muʿallaqa — educational PD text.",
    passages: [
      {
        id: "TW:labid:1",
        titleAr: "عفت الديار",
        titleEn: "The abodes faded",
        textAr:
          "عَفَتِ الدِّيارُ مَحَلُّها فَمُقامُها · بِمِنًى تَأَبَّدَ غَولُها فَرِجامُها",
        meter: "الكامل",
      },
      {
        id: "TW:labid:2",
        titleAr: "إن التقى",
        titleEn: "When piety",
        textAr: "إِنَّ التَّقِيَّ هُوَ التَّقِيُّ وَإِنَّهُ · ما عاشَ مِن خَلقِ الإِلَهِ بِمُخلَدِ",
        meter: "الكامل",
      },
    ],
  },
  {
    slug: "antarah",
    titleAr: "مختارات من عنترة",
    titleEn: "Selections from ʿAntarah",
    kind: "poetry",
    descriptionAr: "أبيات فروسية مشهورة من الملك العام.",
    descriptionEn: "Famous heroic lines from the public domain.",
    passages: [
      {
        id: "TW:antarah:1",
        titleAr: "هل غادر الشعراء",
        titleEn: "Have the poets left",
        textAr:
          "هَل غادَرَ الشُّعَراءُ مِن مُتَرَدَّمِ · أَم هَل عَرَفتَ الدارَ بَعدَ تَوَهُّمِ",
        meter: "الكامل",
      },
      {
        id: "TW:antarah:2",
        titleAr: "يدعون عنتر",
        titleEn: "They call Antarah",
        textAr:
          "يَدعونَ عَنتَرَ وَالرِّماحُ كَأَنَّها · أَشطانُ بِئرٍ في لَبانِ الأَدهَمِ",
        meter: "الكامل",
      },
    ],
  },
  {
    slug: "buhturi",
    titleAr: "مختارات من البحتري",
    titleEn: "Selections from al-Buḥturī",
    kind: "poetry",
    descriptionAr: "أبيات وصفية من التراث العباسي — ملك عام.",
    descriptionEn: "Descriptive Abbasid lines — public domain.",
    passages: [
      {
        id: "TW:buhturi:1",
        titleAr: "أتاك الربيع",
        titleEn: "Spring has come",
        textAr:
          "أَتاكَ الرَّبيعُ الطَّلقُ يَختالُ ضاحِكاً · مِنَ الحُسنِ حَتّى كادَ أَن يَتَكَلَّما",
        meter: "الطويل",
      },
      {
        id: "TW:buhturi:2",
        titleAr: "إذا أرقت",
        titleEn: "When sleepless",
        textAr: "إذا أَرِقتَ وَأَمضى اللَيلُ ساهِرَهُ · فَإِنَّ في الصُبحِ لِلساهِرِ أَوطانا",
        meter: "البسيط",
      },
    ],
  },
];

async function main() {
  await fs.mkdir(WORKS, { recursive: true });
  await fs.mkdir(path.join(ROOT, "catalogs"), { recursive: true });

  // 1) Ashaar arudi
  console.log("Fetching Ashaar arudi CSV…");
  const csvText = await fetchText(ASHAAR_URL);
  const rows = parseSimpleCsv(csvText);
  const ashaarPassages = coupletsFromAshaar(rows, 36);
  const ashaarWork = {
    slug: "ashaar-arudi",
    titleAr: "شواهد عروضية (أشعار)",
    titleEn: "Prosody samples (Ashaar)",
    kind: "prosody",
    source: "ARBML/Ashaar (resources/ashaar_arudi.csv)",
    license: "see ARBML/Ashaar upstream",
    descriptionAr:
      "شطور مشكولة مع تفعيلات من مشروع Ashaar — أساس طبقة العروض/البلاغة.",
    descriptionEn:
      "Vocalized hemistichs with meters from ARBML/Ashaar — prosody/rhetoric layer.",
    passages: ashaarPassages,
  };
  await fs.writeFile(
    path.join(WORKS, "ashaar-arudi.json"),
    JSON.stringify(ashaarWork, null, 2) + "\n",
    "utf8",
  );
  console.log(`ashaar-arudi: ${ashaarPassages.length} passages`);

  // 2) Historical encyclopedia sample
  console.log("Fetching Historical Encyclopedia…");
  const hist = JSON.parse(await fetchText(HIST_URL));
  const histPassages = hist.slice(0, 60).map((ev, i) => ({
    id: `TW:siyar-sample:${i + 1}`,
    titleAr: String(ev.title || `حدث ${i + 1}`).trim(),
    titleEn: `Event ${ev.id ?? i + 1}`,
    textAr: String(ev.text || ev.title || "").slice(0, 900),
    meter: null,
    dateNote: Array.isArray(ev.date) ? ev.date.join(" · ") : undefined,
  }));
  const histWork = {
    slug: "siyar-sample",
    titleAr: "مختارات من موسوعة السيرة والتاريخ",
    titleEn: "Sīrah & history encyclopedia sample",
    kind: "prose",
    source: "rn0x/Historical_Encyclopedia (database/history.json, first 60)",
    license: "see rn0x/Historical_Encyclopedia LICENSE",
    descriptionAr:
      "عيّنة محدودة (60 حدثًا) من موسوعة تاريخية مفتوحة — ليس الملف الكامل.",
    descriptionEn:
      "Bounded sample (60 events) from an open historical encyclopedia — not the full dump.",
    passages: histPassages,
  };
  await fs.writeFile(
    path.join(WORKS, "siyar-sample.json"),
    JSON.stringify(histWork, null, 2) + "\n",
    "utf8",
  );
  console.log(`siyar-sample: ${histPassages.length} passages`);

  // 3) Public-domain poets
  for (const poet of PD_POETS) {
    const work = {
      ...poet,
      source: "arabya-editorial-public-domain",
      license: "public-domain-text-educational",
    };
    await fs.writeFile(
      path.join(WORKS, `${poet.slug}.json`),
      JSON.stringify(work, null, 2) + "\n",
      "utf8",
    );
    console.log(`${poet.slug}: ${poet.passages.length} passages`);
  }

  // 4) Binbaz books catalog (metadata only — PDFs stay upstream)
  console.log("Fetching binbaz books catalog…");
  const books = JSON.parse(await fetchText(BINBAZ_BOOKS_URL));
  const catalog = {
    updatedAt: new Date().toISOString().slice(0, 10),
    source: "rn0x/binbaz_database (database/books_ar.json)",
    license: "see rn0x/binbaz_database LICENSE",
    note: "Catalog metadata only — full fatwa JSON dumps deferred (multi-MB).",
    books: books.map((b) => ({
      id: b.id,
      titleAr: b.title,
      sourceUrl: b.link,
      coverUrl: b.image || null,
      pdfCount: Array.isArray(b.pdf) ? b.pdf.length : 0,
    })),
  };
  await fs.writeFile(
    path.join(ROOT, "catalogs", "binbaz-books.json"),
    JSON.stringify(catalog, null, 2) + "\n",
    "utf8",
  );
  console.log(`binbaz-books catalog: ${catalog.books.length}`);

  // 5) Refresh index.json
  const index = {
    updatedAt: new Date().toISOString().slice(0, 10),
    sourceNote:
      "تراث موسّع: Ashaar عروض + عيّنة موسوعة تاريخية + شعراء ملك عام + كتالوج بن باز (بيانات).",
    works: [
      {
        slug: "qafiyah-intro",
        titleAr: "مدخل إلى العروض والقافية",
        titleEn: "Intro to prosody & rhyme",
        kind: "prosody",
        descriptionAr: "شروح قصيرة لمصطلحات العروض مفيدة لطبقة البلاغة/الشعر.",
        descriptionEn: "Short prosody terms useful for rhetoric/poetry layers.",
      },
      {
        slug: "ashaar-arudi",
        titleAr: ashaarWork.titleAr,
        titleEn: ashaarWork.titleEn,
        kind: "prosody",
        descriptionAr: ashaarWork.descriptionAr,
        descriptionEn: ashaarWork.descriptionEn,
      },
      {
        slug: "mutanabbi-samples",
        titleAr: "مختارات من المتنبي",
        titleEn: "Selections from al-Mutanabbi",
        kind: "poetry",
      },
      {
        slug: "imru-al-qays",
        titleAr: "مختارات من امرئ القيس",
        titleEn: "Selections from Imruʾ al-Qays",
        kind: "poetry",
      },
      {
        slug: "abu-tammam",
        titleAr: "مختارات من أبي تمام",
        titleEn: "Selections from Abu Tammam",
        kind: "poetry",
      },
      ...PD_POETS.map((p) => ({
        slug: p.slug,
        titleAr: p.titleAr,
        titleEn: p.titleEn,
        kind: p.kind,
        descriptionAr: p.descriptionAr,
        descriptionEn: p.descriptionEn,
      })),
      {
        slug: "nahw-aphorisms",
        titleAr: "حكم نحوية قصيرة",
        titleEn: "Short grammar aphorisms",
        kind: "prose",
      },
      {
        slug: "siyar-sample",
        titleAr: histWork.titleAr,
        titleEn: histWork.titleEn,
        kind: "prose",
        descriptionAr: histWork.descriptionAr,
        descriptionEn: histWork.descriptionEn,
      },
    ],
  };

  // Fill passageCount from files
  for (const meta of index.works) {
    try {
      const full = JSON.parse(
        await fs.readFile(path.join(WORKS, `${meta.slug}.json`), "utf8"),
      );
      meta.passageCount = full.passages?.length ?? 0;
    } catch {
      meta.passageCount = 0;
    }
  }

  await fs.writeFile(
    path.join(ROOT, "index.json"),
    JSON.stringify(index, null, 2) + "\n",
    "utf8",
  );
  console.log(`index: ${index.works.length} works`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
