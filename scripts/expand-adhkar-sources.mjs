#!/usr/bin/env node
/**
 * Expands data/adhkar from open sources:
 * - rn0x/Adhkar-json (Hisn al-Muslim style, MIT-friendly community JSON)
 * - sehalhussain/Hadith-Dua-assets (Hisn al-Muslim duas)
 *
 * Run: node scripts/expand-adhkar-sources.mjs
 * Requires: curl or pre-downloaded /tmp/rn0x-adhkar.json
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.join(process.cwd(), "data", "adhkar");
const RN0X_URL =
  "https://raw.githubusercontent.com/rn0x/Adhkar-json/main/adhkar.json";
const HISN_URL =
  "https://raw.githubusercontent.com/sehalhussain/Hadith-Dua-assets/main/duas-adhkar-hisnul-muslim.json";


function normalizeText(text) {
  let t = String(text || "").trim();
  if (t.startsWith("((")) {
    t = t.replace(/^\(\(/, "").replace(/\)\)\.?\s*$/, "");
  }
  return t.replace(/\s+/g, " ").trim();
}

function textKey(text) {
  return normalizeText(text).slice(0, 120);
}

async function fetchJson(url, cachePath) {
  try {
    await fs.access(cachePath);
    const raw = await fs.readFile(cachePath, "utf8");
    return JSON.parse(raw);
  } catch {
    execSync(`curl -sL "${url}" -o "${cachePath}"`, { stdio: "inherit" });
    const raw = await fs.readFile(cachePath, "utf8");
    return JSON.parse(raw);
  }
}

function mergeItems(existing, incoming, slug, startId = 1) {
  const seen = new Set(existing.map((i) => textKey(i.textAr)));
  let nextId = startId;
  for (const item of incoming) {
    const textAr = normalizeText(item.textAr || item.text);
    if (!textAr || seen.has(textKey(textAr))) continue;
    seen.add(textKey(textAr));
    existing.push({
      id: `${slug}-${nextId++}`,
      textAr,
      repeat: Math.max(1, Number(item.repeat || item.count) || 1),
      source: item.source || "حصن المسلم",
      fadlAr: item.fadlAr || undefined,
      fadlEn: item.fadlEn || undefined,
    });
  }
  return existing;
}

/** Map rn0x category id -> Arabya slug */
const RN0X_MAP = {
  1: ["morning", "evening"],
  2: ["sleep"],
  3: ["waking"],
  27: ["after-salah"],
  34: ["distress"],
  35: ["distress"],
  96: ["travel"],
  97: ["travel"],
  105: ["travel"],
  130: ["general"],
};

async function main() {
  const rn0xPath = "/tmp/rn0x-adhkar.json";
  const hisnPath = "/tmp/hisn-duas.json";
  const rn0x = await fetchJson(RN0X_URL, rn0xPath);
  const hisn = await fetchJson(HISN_URL, hisnPath);

  const index = JSON.parse(await fs.readFile(path.join(ROOT, "index.json"), "utf8"));
  const existingSlugs = new Set(index.categories.map((c) => c.slug));

  const newMeta = [
    {
      slug: "waking",
      titleAr: "أذكار الاستيقاظ",
      titleEn: "Upon waking",
      descriptionAr: "أذكار تُقال عند الاستيقاظ من النوم.",
      descriptionEn: "Remembrances upon waking from sleep.",
    },
    {
      slug: "travel",
      titleAr: "أذكار السفر",
      titleEn: "Travel",
      descriptionAr: "أدعية وأذكار السفر والرجوع.",
      descriptionEn: "Supplications for travel and return.",
    },
    {
      slug: "distress",
      titleAr: "أذكار الكرب والهم",
      titleEn: "Distress & anxiety",
      descriptionAr: "أدعية الهم والحزن والكرب.",
      descriptionEn: "Supplications for worry, grief, and hardship.",
    },
  ];

  for (const meta of newMeta) {
    if (!existingSlugs.has(meta.slug)) {
      index.categories.push(meta);
      existingSlugs.add(meta.slug);
    }
  }

  index.sourceNote =
    "Curated for Arabya from Qur98/azkar (MIT), rn0x/Adhkar-json, and sehalhussain/Hadith-Dua-assets (Hisn al-Muslim). Expand with owner-supplied licensed editions later.";

  const buckets = {};
  for (const slug of [...existingSlugs]) {
    const file = path.join(ROOT, `${slug}.json`);
    try {
      const parsed = JSON.parse(await fs.readFile(file, "utf8"));
      buckets[slug] = parsed.items || [];
    } catch {
      buckets[slug] = [];
    }
  }

  for (const block of rn0x) {
    const targets = RN0X_MAP[block.id];
    if (!targets) continue;
    const items = (block.array || []).map((row) => ({
      text: row.text,
      count: row.count,
      source: "حصن المسلم",
    }));
    for (const slug of targets) {
      if (!buckets[slug]) buckets[slug] = [];
      mergeItems(buckets[slug], items, slug, buckets[slug].length + 1);
    }
  }

  for (const [slug, items] of Object.entries(buckets)) {
    if (slug === "duas" || slug === "tasbeeh") continue;
    await fs.writeFile(
      path.join(ROOT, `${slug}.json`),
      JSON.stringify({ slug, items }, null, 2) + "\n",
      "utf8",
    );
  }

  const duasFile = path.join(ROOT, "duas.json");
  const duasParsed = JSON.parse(await fs.readFile(duasFile, "utf8"));
  const duas = duasParsed.items || [];
  const duaSeen = new Set(duas.map((d) => textKey(d.textAr)));
  let duaId = duas.length + 1;

  for (const segment of hisn.segments || []) {
    for (const cat of segment.categories || []) {
      const categoryAr = cat.category_name || "عام";
      const categoryEn = segment.segment_name || "General";
      for (const title of cat.titles || []) {
        for (const dua of title.duas || []) {
          const textAr = normalizeText(dua.arabic);
          if (!textAr || duaSeen.has(textKey(textAr))) continue;
          duaSeen.add(textKey(textAr));
          duas.push({
            id: `dua-hisn-${duaId++}`,
            categoryAr,
            categoryEn,
            textAr,
            source: dua.source || "Hisn al-Muslim",
          });
        }
      }
    }
  }

  duasParsed.sourceNote =
    "Quranic/prophetic duas plus Hisn al-Muslim (sehalhussain/Hadith-Dua-assets).";
  duasParsed.items = duas;
  await fs.writeFile(duasFile, JSON.stringify(duasParsed, null, 2) + "\n", "utf8");

  await fs.writeFile(
    path.join(ROOT, "index.json"),
    JSON.stringify(index, null, 2) + "\n",
    "utf8",
  );

  const summary = index.categories.map((c) => {
    const count = buckets[c.slug]?.length ?? 0;
    return `${c.slug}: ${count}`;
  });
  console.log("Expanded adhkar categories:\n" + summary.join("\n"));
  console.log(`Duas total: ${duas.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
