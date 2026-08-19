import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ensureImportedBooksRoot,
  getImportedBooksRoot,
  getImportedClaimsRoot,
} from "@/lib/import-book/paths";
import type { IrabBookPayload } from "@/lib/import-book/types";

async function upsertImportedCatalog(
  slug: string,
  entry: {
    id: string;
    label: string;
    title: string;
    status: string;
    license?: string;
  },
) {
  const root = ensureImportedBooksRoot();
  const indexPath = path.join(root, "index.json");
  let index: { books: typeof entry[] } = { books: [] };
  try {
    index = JSON.parse(await readFile(indexPath, "utf8"));
  } catch {
    /* new */
  }
  const books = index.books ?? [];
  const existing = books.find((b) => b.id === slug);
  if (existing) Object.assign(existing, entry);
  else books.push(entry);
  await writeFile(indexPath, JSON.stringify({ books }, null, 2), "utf8");
}

async function upsertClaimsIndex(sourceId: string, label: string) {
  const indexPath = path.join(getImportedClaimsRoot(), "index.json");
  await mkdir(path.dirname(indexPath), { recursive: true });
  let index: { sources: { id: string; label: string }[] } = { sources: [] };
  try {
    index = JSON.parse(await readFile(indexPath, "utf8"));
  } catch {
    /* new */
  }
  const sources = index.sources ?? [];
  const existing = sources.find((s) => s.id === sourceId);
  if (existing) existing.label = label;
  else sources.push({ id: sourceId, label });
  await writeFile(indexPath, JSON.stringify({ sources }, null, 2), "utf8");
}

/** Write owner book under ARABYA_IMPORTED_BOOKS_DIR (persistent on Contabo). */
export async function importIrabBookToDisk(
  slug: string,
  raw: IrabBookPayload,
  opts: { writeClaims?: boolean } = {},
): Promise<{ slug: string; surahFiles: number }> {
  const writeClaims = opts.writeClaims !== false;
  const root = ensureImportedBooksRoot();
  const outDir = path.join(root, slug);
  await mkdir(outDir, { recursive: true });

  await writeFile(
    path.join(outDir, "meta.json"),
    JSON.stringify(
      {
        id: slug,
        title: raw.meta?.title || slug,
        license: raw.meta?.license || "owner",
        source: raw.meta?.source || "owner-upload",
        importedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );

  const bySurah = new Map<number, IrabBookPayload["verses"]>();
  const claimsBySurah = new Map<
    number,
    { words: Record<string, unknown>; verses: Record<string, unknown> }
  >();

  for (const v of raw.verses ?? []) {
    const [s] = String(v.verseKey || "").split(":");
    const sid = Number(s);
    if (!sid) continue;
    if (!bySurah.has(sid)) bySurah.set(sid, []);
    bySurah.get(sid)!.push(v);

    if (writeClaims) {
      if (!claimsBySurah.has(sid)) {
        claimsBySurah.set(sid, { words: {}, verses: {} });
      }
      const bucket = claimsBySurah.get(sid)!;
      if (v.text) bucket.verses[v.verseKey] = { text: v.text };
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
    const claimsDir = path.join(getImportedClaimsRoot(), slug);
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

  await upsertImportedCatalog(slug, {
    id: slug,
    label: raw.meta?.title || slug,
    title: raw.meta?.title || slug,
    status: "ready",
    license: raw.meta?.license || "owner",
  });

  return { slug, surahFiles: bySurah.size };
}

export function importedBooksRootForTests(): string {
  return getImportedBooksRoot();
}
