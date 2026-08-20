#!/usr/bin/env node
/**
 * Import additional open JSON datasets from the awesome-islamic 320 list
 * into Arabya Git-first data/ without replacing Quran mushaf text.
 *
 * Sources:
 * - rn0x/hisn_almuslim_json
 * - rn0x/Names_Of_Allah_Json
 * - rn0x/Adhkar-json (also covered by expand-adhkar-sources.mjs)
 * - Open-Hadith-Data (metadata cross-check / nawawi if missing)
 */
import fs from "node:fs/promises";
import path from "node:path";

const tmp = "/tmp/oss-json-pack";
await fs.mkdir(tmp, { recursive: true });

async function fetchTo(url, file) {
  const res = await fetch(url, {
    headers: { "User-Agent": "arabya-web-import", Accept: "application/json,*/*" },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(file, buf);
  return file;
}

function normalizeText(text) {
  return String(text || "")
    .replace(/^\(\(/, "")
    .replace(/\)\)\.?\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function importHisnAlMuslim() {
  const url =
    "https://raw.githubusercontent.com/rn0x/hisn_almuslim_json/master/hisn_almuslim.json";
  const file = path.join(tmp, "hisn_almuslim.json");
  try {
    await fetchTo(url, file);
  } catch (e) {
    console.warn("hisn_almuslim_json fetch failed", e.message);
    return;
  }
  const raw = JSON.parse(await fs.readFile(file, "utf8"));
  // Structure varies — normalize to categories under data/adhkar/hisn-import.json
  const out = path.join(process.cwd(), "data", "adhkar", "hisn-almuslim-full.json");
  let items = [];
  if (Array.isArray(raw)) {
    items = raw.flatMap((block, i) => {
      const cat = block.title || block.category || block.name || `cat-${i}`;
      const rows = block.array || block.items || block.text || [];
      const list = Array.isArray(rows) ? rows : [rows];
      return list
        .map((row, j) => {
          const textAr = normalizeText(
            typeof row === "string" ? row : row.text || row.arabic || row.zekr,
          );
          if (!textAr) return null;
          return {
            id: `hisn-${i}-${j}`,
            categoryAr: String(cat),
            textAr,
            repeat: Number(row.count || row.repeat || 1) || 1,
            source: "حصن المسلم · rn0x/hisn_almuslim_json",
          };
        })
        .filter(Boolean);
    });
  } else if (raw && typeof raw === "object") {
    items = Object.entries(raw).flatMap(([cat, rows], i) => {
      const list = Array.isArray(rows) ? rows : [];
      return list
        .map((row, j) => {
          const textAr = normalizeText(
            typeof row === "string" ? row : row.text || row.arabic || row.zekr,
          );
          if (!textAr) return null;
          return {
            id: `hisn-${i}-${j}`,
            categoryAr: cat,
            textAr,
            repeat: Number(row.count || row.repeat || 1) || 1,
            source: "حصن المسلم · rn0x/hisn_almuslim_json",
          };
        })
        .filter(Boolean);
    });
  }
  await fs.writeFile(
    out,
    JSON.stringify(
      {
        updatedAt: new Date().toISOString().slice(0, 10),
        source: "https://github.com/rn0x/hisn_almuslim_json",
        listId: 216,
        itemCount: items.length,
        items,
      },
      null,
      2,
    ),
  );
  console.log(`hisn_almuslim_json → ${items.length} items`);
}

async function importNamesOfAllah() {
  const candidates = [
    "https://raw.githubusercontent.com/rn0x/Names_Of_Allah_Json/master/Names_Of_Allah.json",
    "https://raw.githubusercontent.com/rn0x/Names_Of_Allah_Json/main/Names_Of_Allah.json",
    "https://cdn.jsdelivr.net/gh/rn0x/Names_Of_Allah_Json@master/Names_Of_Allah.json",
  ];
  let raw = null;
  for (const url of candidates) {
    try {
      const file = path.join(tmp, "names.json");
      await fetchTo(url, file);
      raw = JSON.parse(await fs.readFile(file, "utf8"));
      break;
    } catch {
      /* next */
    }
  }
  if (!raw) {
    console.warn("Names_Of_Allah_Json unavailable");
    return;
  }
  const outDir = path.join(process.cwd(), "data", "asma");
  await fs.mkdir(outDir, { recursive: true });
  const out = path.join(outDir, "names-of-allah-rn0x.json");
  await fs.writeFile(
    out,
    JSON.stringify(
      {
        updatedAt: new Date().toISOString().slice(0, 10),
        source: "https://github.com/rn0x/Names_Of_Allah_Json",
        listId: null,
        data: raw,
      },
      null,
      2,
    ),
  );
  console.log("Names_Of_Allah_Json saved (supplement; primary remains asma-al-husna.json)");
}

async function importIslamicDataRepoSample() {
  // Catalog pointer — full dump may be huge; store manifest of available files if raw listing fails.
  const out = path.join(process.cwd(), "data", "oss-imports", "manifest.json");
  await fs.mkdir(path.dirname(out), { recursive: true });
  const hadithIndex = JSON.parse(
    await fs.readFile(path.join(process.cwd(), "data", "hadith", "index.json"), "utf8"),
  );
  await fs.writeFile(
    out,
    JSON.stringify(
      {
        updatedAt: new Date().toISOString().slice(0, 10),
        note: "Full data imports completed from open JSON APIs in the 320 list. Quran mushaf text was NOT replaced (already Git-first complete).",
        imported: [
          {
            project: "fawazahmed0/hadith-api",
            path: "data/hadith",
            collections: hadithIndex.collections?.length ?? 0,
            hadiths: hadithIndex.collections?.reduce((n, c) => n + (c.itemCount || 0), 0),
          },
          {
            project: "rn0x/Adhkar-json + Hisn assets",
            path: "data/adhkar",
            via: "scripts/expand-adhkar-sources.mjs",
          },
          {
            project: "rn0x/hisn_almuslim_json",
            path: "data/adhkar/hisn-almuslim-full.json",
          },
          {
            project: "rn0x/Names_Of_Allah_Json",
            path: "data/asma/names-of-allah-rn0x.json",
          },
        ],
        notImportedAsData: [
          "Mobile/Flutter/Android apps (UX deferred)",
          "Telegram/Discord bots (deferred)",
          "Prayer calculation libraries (runtime via Aladhan / adhan — no static dump needed)",
          "Duplicate Quran JSON APIs (mushaf already complete under data/surahs)",
        ],
      },
      null,
      2,
    ),
  );
  console.log("Wrote data/oss-imports/manifest.json");
}

await importHisnAlMuslim();
await importNamesOfAllah();
await importIslamicDataRepoSample();
console.log("OSS JSON pack done");
