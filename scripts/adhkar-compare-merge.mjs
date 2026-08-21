/**
 * Compare nawafalqari/azkar-api adkar.json with Arabya data/adhkar and
 * append only clearly missing items into matching categories.
 *
 * Usage: node scripts/adhkar-compare-merge.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ADHKAR_DIR = path.join(ROOT, "data/adhkar");
const REMOTE_URL =
  "https://raw.githubusercontent.com/nawafalqari/azkar-api/main/src/data/adkar.json";

const MAP = {
  "أذكار الصباح": "morning",
  "أذكار المساء": "evening",
  "أذكار بعد السلام من الصلاة المفروضة": "after-salah",
  تسابيح: "general",
  "أذكار النوم": "sleep",
  "أذكار الاستيقاظ": "waking",
  "أدعية قرآنية": "duas",
  "أدعية الأنبياء": "duas",
};

function stripTashkeel(s) {
  return String(s || "")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[^\u0600-\u06FF\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadCategory(slug) {
  const file = path.join(ADHKAR_DIR, `${slug}.json`);
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  if (Array.isArray(raw)) return { file, kind: "array", data: raw };
  if (raw && Array.isArray(raw.items)) return { file, kind: "items", data: raw };
  throw new Error(`Unexpected shape for ${slug}`);
}

function existingKeys(cat) {
  const items = cat.kind === "array" ? cat.data : cat.data.items;
  return new Set(items.map((it) => stripTashkeel(it.textAr || it.text || "")));
}

function nextId(slug, items) {
  let max = 0;
  for (const it of items) {
    const m = String(it.id || "").match(/(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${slug}-${max + 1}`;
}

const remote = await (await fetch(REMOTE_URL)).json();
const report = [];
let addedTotal = 0;

for (const [remoteCat, slug] of Object.entries(MAP)) {
  const list = remote[remoteCat];
  if (!Array.isArray(list)) continue;
  const cat = loadCategory(slug);
  const items = cat.kind === "array" ? cat.data : cat.data.items;
  const keys = existingKeys(cat);
  let added = 0;
  for (const row of list) {
    const text = String(row.content || "").trim();
    if (!text) continue;
    const key = stripTashkeel(text);
    if (!key || keys.has(key)) continue;
    keys.add(key);
    const repeat = Math.max(1, Number(String(row.count || "1").replace(/\D/g, "")) || 1);
    const item = {
      id: nextId(slug, items),
      textAr: text,
      repeat,
      source: row.reference || "azkar-api",
      fadlAr: row.description || "أضيف من مقارنة مصادر مفتوحة (azkar-api).",
      fadlEn: row.description || "Added via open-source azkar comparison (azkar-api).",
      importedFrom: "nawafalqari/azkar-api",
    };
    // duas.json uses DuaItem shape (category required for /adhkar/duas build)
    if (slug === "duas") {
      item.categoryAr =
        remoteCat === "أدعية الأنبياء" ? "أنبياء" : "قرآني";
      item.categoryEn =
        remoteCat === "أدعية الأنبياء" ? "Prophets" : "Quranic";
    }
    items.push(item);
    added += 1;
    addedTotal += 1;
  }
  if (added) {
    if (cat.kind === "items") {
      cat.data.items = items;
      fs.writeFileSync(cat.file, `${JSON.stringify(cat.data, null, 2)}\n`, "utf8");
    } else {
      fs.writeFileSync(cat.file, `${JSON.stringify(items, null, 2)}\n`, "utf8");
    }
  }
  report.push({ remoteCat, slug, remoteCount: list.length, added });
}

const indexPath = path.join(ADHKAR_DIR, "index.json");
const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const note =
  "Curated for Arabya from Qur98/azkar (MIT), rn0x/Adhkar-json, sehalhussain/Hadith-Dua-assets (Hisn), and nawafalqari/azkar-api (compare-merge). Expand with owner-supplied licensed editions later.";
index.sourceNote = note;
fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");

console.log(JSON.stringify({ addedTotal, report }, null, 2));
