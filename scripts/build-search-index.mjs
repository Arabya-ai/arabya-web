/**
 * Builds a compact ayah search index from local surah JSON.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");

async function main() {
  const surahsMeta = JSON.parse(
    await readFile(path.join(dataDir, "surahs.json"), "utf8"),
  );
  const mushaf = JSON.parse(
    await readFile(path.join(dataDir, "mushaf-index.json"), "utf8"),
  );

  /** @type {{ key: string, surahId: number, verse: number, page: number, text: string, nameAr: string }[]} */
  const verses = [];

  for (const meta of surahsMeta) {
    const surah = JSON.parse(
      await readFile(path.join(dataDir, "surahs", `${meta.id}.json`), "utf8"),
    );
    for (const v of surah.verses) {
      const text = v.words.map((w) => w.text).join(" ");
      verses.push({
        key: v.verseKey,
        surahId: meta.id,
        verse: v.verseNumber,
        page: v.page ?? mushaf.surahFirstPage[String(meta.id)] ?? 1,
        text,
        nameAr: meta.nameArabic,
      });
    }
  }

  await mkdir(dataDir, { recursive: true });
  await writeFile(
    path.join(dataDir, "search-index.json"),
    JSON.stringify({ verseCount: verses.length, verses }, null, 0),
    "utf8",
  );
  console.log("Search index:", verses.length, "verses");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
