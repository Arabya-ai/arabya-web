import { rm } from "node:fs/promises";
import path from "node:path";
import { getLibraryCatalogForEditors } from "@/lib/library";
import { ensureImportedLibraryRoot } from "@/lib/library/paths";
import type { LibraryWorkMeta } from "@/lib/library/types";
import { readJsonFile } from "@/lib/library/json-file";

export { readJsonFile };

async function readImportedIndex(): Promise<{ works: LibraryWorkMeta[] }> {
  const indexPath = path.join(ensureImportedLibraryRoot(), "index.json");
  const parsed = await readJsonFile<{ works: LibraryWorkMeta[] }>(indexPath);
  return { works: parsed?.works ?? [] };
}

async function writeImportedIndex(works: LibraryWorkMeta[]) {
  const { writeFile } = await import("node:fs/promises");
  const indexPath = path.join(ensureImportedLibraryRoot(), "index.json");
  await writeFile(indexPath, JSON.stringify({ works }, null, 2), "utf8");
}

export async function upsertImportedCatalogEntry(entry: LibraryWorkMeta) {
  const { works } = await readImportedIndex();
  const idx = works.findIndex((w) => w.id === entry.id);
  if (idx >= 0) works[idx] = { ...works[idx], ...entry };
  else works.push(entry);
  await writeImportedIndex(works);
}

export async function updateLibraryWorkMeta(
  slug: string,
  patch: Partial<LibraryWorkMeta>,
): Promise<LibraryWorkMeta | null> {
  const { writeFile, mkdir } = await import("node:fs/promises");
  const root = ensureImportedLibraryRoot();
  const dir = path.join(root, slug);
  await mkdir(dir, { recursive: true });
  const metaPath = path.join(dir, "meta.json");
  const fromFile = await readJsonFile<LibraryWorkMeta>(metaPath);
  const fromCatalog = (await getLibraryCatalogForEditors()).find((w) => w.id === slug);
  const existing = fromFile ?? fromCatalog ?? { id: slug, title: slug, status: "ready" as const, pdfUrl: "" };
  const next: LibraryWorkMeta = {
    ...existing,
    ...patch,
    id: slug,
    title: patch.title || existing.title || slug,
    pdfUrl: patch.pdfUrl || existing.pdfUrl || `/api/library/${slug}/file`,
    status: patch.status || existing.status || "ready",
  };
  await writeFile(metaPath, JSON.stringify(next, null, 2), "utf8");
  await upsertImportedCatalogEntry(next);
  return next;
}

export async function deleteLibraryWork(slug: string): Promise<void> {
  const root = ensureImportedLibraryRoot();
  const dir = path.join(root, slug);
  await rm(dir, { recursive: true, force: true });
  const { works } = await readImportedIndex();
  const tombstone: LibraryWorkMeta = {
    id: slug,
    title: slug,
    status: "deleted",
    pdfUrl: "",
  };
  const idx = works.findIndex((w) => w.id === slug);
  if (idx >= 0) works[idx] = { ...works[idx], ...tombstone };
  else works.push(tombstone);
  await writeImportedIndex(works);
}
