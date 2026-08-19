/**
 * Import a licensed iʿrāb book into data/books/{slug}/
 * Usage: node scripts/import-irab-book.mjs --slug=darwish --from=./incoming/darwish.json
 *
 * Expected input JSON:
 * {
 *   "meta": { "title", "license", "source" },
 *   "verses": [{
 *     "verseKey": "1:1",
 *     "text": "...",
 *     "words": [{ "wordId": "W:001:001:001", "text": "...", "evidence": "..." }]
 *   }]
 * }
 *
 * Optional: --claims  also writes data/irab-claims/{slug}/ for multi-source dock UI.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

async function upsertClaimsIndex(sourceId, label) {
  const indexPath = path.join(root, "data", "irab-claims", "index.json");
  let index = { sources: [] };
  try {
    index = JSON.parse(await readFile(indexPath, "utf8"));
  } catch {
    /* new index */
  }
  const sources = index.sources ?? [];
  const existing = sources.find((s) => s.id === sourceId);
  if (existing) {
    existing.label = label;
  } else {
    sources.push({ id: sourceId, label });
  }
  index.sources = sources;
  await mkdir(path.dirname(indexPath), { recursive: true });
  await writeFile(indexPath, JSON.stringify(index, null, 2), "utf8");
}

async function main() {
  const slug = arg("slug");
  const from = arg("from");
  const writeClaims = hasFlag("claims");
  if (!slug || !from) {
    console.error(
      "Usage: node scripts/import-irab-book.mjs --slug=NAME --from=path.json [--claims]",
    );
    process.exit(1);
  }

  const raw = JSON.parse(await readFile(path.resolve(from), "utf8"));
  const outDir = path.join(root, "data", "books", slug);
  await mkdir(outDir, { recursive: true });

  await writeFile(
    path.join(outDir, "meta.json"),
    JSON.stringify(
      {
        id: slug,
        title: raw.meta?.title || slug,
        license: raw.meta?.license || "licensed",
        source: raw.meta?.source || "",
        importedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );

  const bySurah = new Map();
  const claimsBySurah = new Map();

  for (const v of raw.verses ?? []) {
    const [s] = String(v.verseKey || "").split(":");
    const sid = Number(s);
    if (!sid) continue;
    if (!bySurah.has(sid)) bySurah.set(sid, []);
    bySurah.get(sid).push(v);

    if (writeClaims) {
      if (!claimsBySurah.has(sid)) {
        claimsBySurah.set(sid, { words: {}, verses: {} });
      }
      const bucket = claimsBySurah.get(sid);
      if (v.text) {
        bucket.verses[v.verseKey] = { text: v.text };
      }
      for (const w of v.words ?? []) {
        if (!w.wordId || !w.text) continue;
        bucket.words[w.wordId] = {
          text: w.text,
          evidence: w.evidence,
          confidence: w.confidence,
        };
      }
    }
  }

  await mkdir(path.join(outDir, "verses"), { recursive: true });
  for (const [sid, verses] of bySurah) {
    await writeFile(
      path.join(outDir, "verses", `${sid}.json`),
      JSON.stringify({ id: sid, verses }, null, 2),
      "utf8",
    );
  }

  if (writeClaims) {
    const claimsDir = path.join(root, "data", "irab-claims", slug);
    await mkdir(claimsDir, { recursive: true });
    for (const [sid, payload] of claimsBySurah) {
      await writeFile(
        path.join(claimsDir, `${sid}.json`),
        JSON.stringify(
          {
            surahId: sid,
            sourceId: slug,
            words: payload.words,
            verses: payload.verses,
          },
          null,
          2,
        ),
        "utf8",
      );
    }
    await upsertClaimsIndex(slug, raw.meta?.title || slug);
  }

  const indexPath = path.join(root, "data", "books", "index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const books = index.books ?? [];
  const existing = books.find((b) => b.id === slug);
  if (existing) {
    existing.status = "ready";
    existing.label = raw.meta?.title || existing.label;
    existing.title = raw.meta?.title || existing.title;
    existing.license = raw.meta?.license || existing.license;
  } else {
    books.push({
      id: slug,
      label: raw.meta?.title || slug,
      title: raw.meta?.title || slug,
      status: "ready",
      license: raw.meta?.license,
    });
  }
  await writeFile(
    indexPath,
    JSON.stringify({ books }, null, 2),
    "utf8",
  );

  console.log(
    `Imported ${slug}: ${bySurah.size} surah files${writeClaims ? " + claims layer" : ""}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
