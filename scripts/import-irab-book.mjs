/**
 * Import a licensed iʿrāb book into data/books/{slug}/
 * Usage: node scripts/import-irab-book.mjs --slug=darwish --from=./incoming/darwish.json
 *
 * Expected input JSON:
 * {
 *   "meta": { "title", "license", "source" },
 *   "verses": [{ "verseKey": "1:1", "text": "..." }]
 * }
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

async function main() {
  const slug = arg("slug");
  const from = arg("from");
  if (!slug || !from) {
    console.error(
      "Usage: node scripts/import-irab-book.mjs --slug=NAME --from=path.json",
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
  for (const v of raw.verses ?? []) {
    const [s] = String(v.verseKey || "").split(":");
    const sid = Number(s);
    if (!sid) continue;
    if (!bySurah.has(sid)) bySurah.set(sid, []);
    bySurah.get(sid).push(v);
  }

  await mkdir(path.join(outDir, "verses"), { recursive: true });
  for (const [sid, verses] of bySurah) {
    await writeFile(
      path.join(outDir, "verses", `${sid}.json`),
      JSON.stringify({ id: sid, verses }, null, 2),
      "utf8",
    );
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

  console.log(`Imported ${slug}: ${bySurah.size} surah files`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
