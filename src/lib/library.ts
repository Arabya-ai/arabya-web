import path from "node:path";
import { withResolvedCover } from "@/lib/library/covers";
import { readJsonFile } from "@/lib/library/json-file";
import {
  getImportedLibraryRoot,
  gitLibraryDataRoot,
  isSafeLibrarySlug,
  resolveContainedLibraryPath,
} from "@/lib/library/paths";
import type { LibraryCatalog, LibraryWorkMeta } from "@/lib/library/types";

async function loadGitCatalog(): Promise<LibraryWorkMeta[]> {
  const parsed = await readJsonFile<LibraryCatalog>(
    path.join(gitLibraryDataRoot(), "index.json"),
  );
  return (parsed?.works ?? []).filter((w) => w.id);
}

async function loadImportedCatalog(): Promise<LibraryWorkMeta[]> {
  const parsed = await readJsonFile<LibraryCatalog>(
    path.join(getImportedLibraryRoot(), "index.json"),
  );
  return parsed?.works ?? [];
}

function mergeWorks(
  gitWorks: LibraryWorkMeta[],
  importedWorks: LibraryWorkMeta[],
): LibraryWorkMeta[] {
  const byId = new Map<string, LibraryWorkMeta>();
  for (const w of gitWorks) byId.set(w.id, w);
  for (const w of importedWorks) {
    const existing = byId.get(w.id);
    if (existing) byId.set(w.id, { ...existing, ...w });
    else byId.set(w.id, w);
  }
  return [...byId.values()].sort((a, b) =>
    a.title.localeCompare(b.title, "ar"),
  );
}

async function mergedCatalog(): Promise<LibraryWorkMeta[]> {
  const [gitWorks, importedWorks] = await Promise.all([
    loadGitCatalog(),
    loadImportedCatalog(),
  ]);
  return mergeWorks(gitWorks, importedWorks);
}

export async function getLibraryCatalog(): Promise<LibraryWorkMeta[]> {
  return (await mergedCatalog())
    .filter((w) => w.status === "ready")
    .map(withResolvedCover);
}

/** Editor/admin list: published + pending, excluding deleted tombstones. */
export async function getLibraryCatalogForEditors(): Promise<LibraryWorkMeta[]> {
  return (await mergedCatalog())
    .filter((w) => w.status !== "deleted")
    .map(withResolvedCover);
}

export async function getLibraryWork(
  slug: string,
): Promise<LibraryWorkMeta | null> {
  if (!isSafeLibrarySlug(slug)) return null;
  const work = (await mergedCatalog()).find((w) => w.id === slug);
  if (!work || work.status !== "ready") return null;

  const metaPath = resolveContainedLibraryPath(
    getImportedLibraryRoot(),
    slug,
    "meta.json",
  );
  const importedMeta = metaPath
    ? await readJsonFile<LibraryWorkMeta>(metaPath)
    : null;
  if (importedMeta?.status === "deleted") return null;
  if (importedMeta) return withResolvedCover({ ...work, ...importedMeta });

  return withResolvedCover(work);
}

export function resolveLibraryPdfPath(slug: string): string | null {
  return resolveContainedLibraryPath(
    getImportedLibraryRoot(),
    slug,
    "book.pdf",
  );
}
