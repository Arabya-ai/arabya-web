/**
 * Fetch word senses + etymology from quran-words.com and write slim Arabya data.
 *
 * Usage:
 *   node scripts/fetch-quran-words.mjs
 *   node scripts/fetch-quran-words.mjs --surah=1,2
 *   node scripts/fetch-quran-words.mjs --skip-etymology
 *   node scripts/fetch-quran-words.mjs --concurrency=12
 *
 * Also writes a scrape mirror under .cache/quran-words/ (gitignored) so
 * `import-quran-words.mjs --from=.cache/quran-words` can re-run offline.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  alignSurahWords,
  assignAyahNumbers,
  decodeHtmlEntities,
  isAyahRow,
  lexiconKeyFromEtymology,
  stripEtymologyHeading,
} from "./lib/quran-words-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const BASE = "https://www.quran-words.com";

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function parseSurahFilter(raw) {
  if (!raw) return null;
  const set = new Set();
  for (const part of raw.split(",")) {
    const n = Number(part.trim());
    if (Number.isInteger(n) && n >= 1 && n <= 114) set.add(n);
  }
  return set.size ? set : null;
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  const n = Math.min(concurrency, Math.max(1, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchText(url, retries = 6) {
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ar,en;q=0.8",
          Referer: `${BASE}/`,
        },
      });
      if (res.status === 403 || res.status === 429) {
        const wait = 8000 * (attempt + 1);
        console.warn(`  rate-limit ${res.status} — wait ${wait}ms (${url})`);
        await new Promise((r) => setTimeout(r, wait));
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      // polite pacing
      await new Promise((r) => setTimeout(r, 120));
      return await res.text();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  throw lastErr;
}

async function loadSurahSlugs(cacheRoot) {
  const cachePath = path.join(cacheRoot, "_surah-slugs.json");
  try {
    const cached = JSON.parse(await readFile(cachePath, "utf8"));
    if (Array.isArray(cached) && cached.length === 114) {
      console.log("using cached surah slugs");
      return cached;
    }
  } catch {
    /* fetch */
  }
  const html = await fetchText(`${BASE}/`);
  const re = /href="https:\/\/www\.quran-words\.com\/سورة\/([^"]+)"/g;
  const names = [];
  let m;
  while ((m = re.exec(html))) {
    const n = decodeURIComponent(m[1]);
    if (!names.includes(n)) names.push(n);
  }
  if (names.length !== 114) {
    throw new Error(`Expected 114 surah slugs, got ${names.length}`);
  }
  await writeFile(cachePath, `${JSON.stringify(names, null, 2)}\n`, "utf8");
  return names;
}

function parseSurahTable(html, surahSlug) {
  const rows = [];
  const trRe =
    /<tr>\s*<td class='ref'>(\d+)<\/td>\s*<td class='kalemah[^']*'>([\s\S]*?)<\/td>\s*<td class='kalemah-tafseer-cell'>([\s\S]*?)<\/td>\s*<td><a class='btn btn-primary' href='([^']+)'[^>]*>/g;
  let m;
  while ((m = trRe.exec(html))) {
    const word = decodeHtmlEntities(m[2]);
    const sense = decodeHtmlEntities(m[3]);
    const url = m[4];
    rows.push({
      n: m[1],
      word,
      sense,
      url,
      title: "",
      etymology: "",
      quality: "table",
    });
  }
  if (!rows.length) {
    throw new Error(`No table rows for سورة/${surahSlug}`);
  }
  return rows;
}

function parseDetailPage(html) {
  const titleMatch = html.match(/<h1>([\s\S]*?)<\/h1>/);
  const title = titleMatch
    ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, " "))
    : "";
  const ayah = (() => {
    const m = title.match(/آية\s*رقم\s*(\d+)/);
    return m ? Number(m[1]) : null;
  })();
  const rootMatch = html.match(
    /<h2>\s*التفسير الاشتقاقي لجذر الكلمة\s*[«"“]?([^<"”»]+)[»"”]?\s*<\/h2>\s*<p>([\s\S]*?)<\/p>/,
  );
  let etymology = "";
  let root = null;
  if (rootMatch) {
    root = decodeHtmlEntities(rootMatch[1]);
    etymology = decodeHtmlEntities(rootMatch[2]);
  }
  return { title, ayah, root, etymology };
}

async function loadArabyaWords(surahId) {
  const raw = await readFile(
    path.join(root, "data", "surahs", `${surahId}.json`),
    "utf8",
  );
  const surah = JSON.parse(raw);
  const words = [];
  for (const verse of surah.verses) {
    for (const w of verse.words) {
      if (w.charType === "end") continue;
      words.push({
        verse: verse.verseNumber,
        position: w.position,
        text: w.text,
      });
    }
  }
  return words;
}

function lemmaFromUrl(url) {
  try {
    const raw = decodeURIComponent(url);
    const m = raw.match(/\/كلمة\/([^/]+)\/(\d+)/);
    if (!m) return null;
    return { lemma: m[1], siteId: Number(m[2]) };
  } catch {
    return null;
  }
}

async function main() {
  const surahFilter = parseSurahFilter(arg("surah"));
  const concurrency = Number(arg("concurrency") || 10);
  const skipEtymology = hasFlag("skip-etymology");
  const cacheRoot = path.join(root, ".cache", "quran-words");
  await mkdir(cacheRoot, { recursive: true });

  console.log("loading surah slugs…");
  const slugs = await loadSurahSlugs(cacheRoot);

  const surahIds = [];
  for (let i = 1; i <= 114; i++) {
    if (!surahFilter || surahFilter.has(i)) surahIds.push(i);
  }

  console.log(`fetching ${surahIds.length} surah tables…`);
  /** @type {Map<number, any[]>} */
  const surahRows = new Map();
  /** @type {Map<string, string>} lemma -> detail url */
  const lemmaUrls = new Map();
  const tableConcurrency = Math.min(concurrency, 4);

  await mapPool(surahIds, tableConcurrency, async (sid) => {
    const slug = slugs[sid - 1];
    const folder = path.join(
      cacheRoot,
      `${String(sid).padStart(3, "0")}-${slug.replace(/\//g, "-")}`,
    );
    await mkdir(folder, { recursive: true });
    const tablePath = path.join(folder, `_table.json`);
    let rows = null;
    try {
      const cached = JSON.parse(await readFile(tablePath, "utf8"));
      if (Array.isArray(cached.rows) && cached.rows.length) {
        rows = cached.rows;
        console.log(`  surah ${sid} (${slug}): cache ${rows.length} rows`);
      }
    } catch {
      /* fetch fresh */
    }
    if (!rows) {
      const pageUrl = `${BASE}/سورة/${slug}`;
      try {
        const html = await fetchText(pageUrl);
        rows = parseSurahTable(html, slug);
        await writeFile(
          tablePath,
          JSON.stringify({ slug, pageUrl, rowCount: rows.length, rows }, null, 2),
          "utf8",
        );
        console.log(`  surah ${sid} (${slug}): ${rows.length} rows`);
      } catch (err) {
        console.warn(`  surah ${sid} FAIL: ${err.message}`);
        return;
      }
    }
    surahRows.set(sid, rows);
    for (const r of rows) {
      if (isAyahRow(r.word, r.url)) continue;
      const lem = lemmaFromUrl(r.url);
      if (lem && !lemmaUrls.has(lem.lemma)) lemmaUrls.set(lem.lemma, r.url);
    }
  });

  /** @type {Map<string, { root: string|null, etymology: string, title: string }>} */
  const lemmaDetails = new Map();
  const lemmaCachePath = path.join(cacheRoot, "_lemma-details.json");
  try {
    const prev = JSON.parse(await readFile(lemmaCachePath, "utf8"));
    for (const [k, v] of Object.entries(prev)) lemmaDetails.set(k, v);
    console.log(`loaded ${lemmaDetails.size} cached lemma details`);
  } catch {
    /* none */
  }

  if (!skipEtymology) {
    const lemmas = [...lemmaUrls.entries()].filter(
      ([lemma]) => !lemmaDetails.has(lemma),
    );
    console.log(
      `fetching etymology for ${lemmas.length} unique lemmas (${lemmaDetails.size} cached)…`,
    );
    let done = 0;
    const etymConcurrency = Math.min(concurrency, 6);
    await mapPool(lemmas, etymConcurrency, async ([lemma, url]) => {
      try {
        const html = await fetchText(url);
        const detail = parseDetailPage(html);
        lemmaDetails.set(lemma, detail);
      } catch (err) {
        console.warn(`  lemma fail ${lemma}: ${err.message}`);
        lemmaDetails.set(lemma, { root: null, etymology: "", title: "" });
      }
      done += 1;
      if (done % 50 === 0 || done === lemmas.length) {
        console.log(`  etymology ${done}/${lemmas.length}`);
        await writeFile(
          lemmaCachePath,
          JSON.stringify(Object.fromEntries(lemmaDetails)),
          "utf8",
        );
      }
    });
    await writeFile(
      lemmaCachePath,
      JSON.stringify(Object.fromEntries(lemmaDetails)),
      "utf8",
    );
  }

  const sensesOut = path.join(root, "data", "word-senses");
  const lexiconOutDir = path.join(root, "data", "lexicon");
  await mkdir(sensesOut, { recursive: true });
  await mkdir(lexiconOutDir, { recursive: true });

  /** @type {Map<string, { text: string, url: string|null, lemma: string|null }>} */
  const lexicon = new Map();
  const reports = [];
  let totalMatched = 0;
  let totalWords = 0;

  for (const sid of surahIds) {
    const slug = slugs[sid - 1];
    const tableRows = surahRows.get(sid);
    if (!tableRows?.length) {
      reports.push({ surahId: sid, error: "missing-table" });
      continue;
    }
    const enriched = tableRows.map((r) => {
      const lem = lemmaFromUrl(r.url);
      const detail = lem ? lemmaDetails.get(lem.lemma) : null;
      const etymology = detail?.etymology || "";
      const fromEtym = etymology
        ? lexiconKeyFromEtymology(
            detail?.root ? `${detail.root}: ${etymology}` : etymology,
            lem?.lemma,
          )
        : null;
      // Prefer explicit root from heading.
      // Do NOT copy detail.title onto every lemma reuse — that title is for the
      // first occurrence only and would break ayah assignment.
      const key = detail?.root || fromEtym || lem?.lemma || null;
      return {
        word: r.word,
        url: r.url,
        title: "",
        sense: r.sense,
        etymology: stripEtymologyHeading(etymology),
        lexiconKey: key,
        quality: "structured",
        lemma: lem?.lemma || null,
      };
    });

    // Build scrape-compatible JSON for offline re-import
    const scrapeRows = enriched.map((r, idx) => {
      const n = String(tableRows[idx]?.n ?? idx + 1);
      return [
        n,
        r.word,
        r.sense,
        "المزيد",
        r.url,
        r.title,
        r.sense,
        r.etymology,
        "",
        "",
        r.sense,
        r.sense + (r.etymology ? `\n\n---\n\n${r.etymology}` : ""),
        r.quality,
      ];
    });
    const folder = path.join(
      cacheRoot,
      `${String(sid).padStart(3, "0")}-${slug.replace(/\//g, "-")}`,
    );
    await mkdir(folder, { recursive: true });
    await writeFile(
      path.join(folder, `سورة-${slug}.json`),
      JSON.stringify(
        {
          meta: {
            surah: slug,
            source: `${BASE}/سورة/${slug}`,
            scrapedAt: new Date().toISOString(),
            rowCount: scrapeRows.length,
          },
          headers: [
            "رقم",
            "الكلمة",
            "التفسير",
            "المزيد",
            "Detail URL",
            "Detail Title",
            "Short Meaning",
            "Etymology",
            "Tafsir Mayassar",
            "Tafsir Mukhtasar",
            "محتوى المزيد",
            "Detail Text",
            "Detail Quality",
          ],
          rows: scrapeRows,
        },
        null,
        2,
      ),
      "utf8",
    );

    for (const r of enriched) {
      if (r.lexiconKey && r.etymology && !lexicon.has(r.lexiconKey)) {
        lexicon.set(r.lexiconKey, {
          text: r.etymology,
          url: r.url,
          lemma: r.lemma,
        });
      }
    }

    const withAyah = assignAyahNumbers(enriched).filter(
      (r) => !isAyahRow(r.word, r.url),
    );
    const arabyaWords = await loadArabyaWords(sid);
    totalWords += arabyaWords.length;
    const { aligned, report } = alignSurahWords({
      surahId: sid,
      arabyaWords,
      qwWords: withAyah,
    });
    totalMatched += report.matched;
    reports.push(report);

    const words = {};
    for (const a of aligned) {
      if (!a.sense && !a.lexiconKey) continue;
      words[a.wordId] = {
        sense: a.sense || null,
        lexiconKey: a.lexiconKey,
        url: a.url,
      };
    }
    await writeFile(
      path.join(sensesOut, `${sid}.json`),
      `${JSON.stringify({
        id: sid,
        source: "quran-words.com",
        sourceLabel: "تفسير كلمات القرآن الكريم (quran-words.com)",
        sourceUrl: `${BASE}/سورة/${slug}`,
        wordCount: Object.keys(words).length,
        words,
      })}\n`,
      "utf8",
    );
    console.log(
      `aligned surah ${sid}: ${report.matched}/${arabyaWords.length}`,
    );
  }

  // If only a subset was fetched, merge into existing lexicon when present
  let existingEntries = {};
  try {
    const prev = JSON.parse(
      await readFile(path.join(lexiconOutDir, "quran-words.json"), "utf8"),
    );
    existingEntries = prev.entries || {};
  } catch {
    /* first run */
  }
  for (const [k, v] of lexicon) existingEntries[k] = v;

  const lexiconObj = {
    source: "quran-words.com",
    sourceLabel: "تفسير كلمات القرآن الكريم — التفسير الاشتقاقي",
    sourceUrl: BASE,
    entryCount: Object.keys(existingEntries).length,
    entries: existingEntries,
  };
  await writeFile(
    path.join(lexiconOutDir, "quran-words.json"),
    `${JSON.stringify(lexiconObj)}\n`,
    "utf8",
  );

  await writeFile(
    path.join(sensesOut, "_import-report.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: "fetch",
        skipEtymology,
        totalArabyaWords: totalWords,
        totalMatched,
        lexiconEntries: lexiconObj.entryCount,
        surahReports: reports,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(
    `done: matched ${totalMatched}/${totalWords}, lexicon ${lexiconObj.entryCount}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
