import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  getImportedLibraryRoot,
  gitLibraryDataRoot,
} from "@/lib/library/paths";
import type { LibraryCatalog, LibraryWorkMeta } from "@/lib/library/types";

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function loadGitCatalog(): Promise<LibraryWorkMeta[]> {
  const parsed = await readJsonFile<LibraryCatalog>(
    path.join(gitLibraryDataRoot(), "index.json"),
  );
  return (parsed?.works ?? []).filter((w) => w.id && w.status === "ready");
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

export async function getLibraryCatalog(): Promise<LibraryWorkMeta[]> {
  const [gitWorks, importedWorks] = await Promise.all([
    loadGitCatalog(),
    loadImportedCatalog(),
  ]);
  return mergeWorks(gitWorks, importedWorks).filter((w) => w.status === "ready");
}

export async function getLibraryWork(
  slug: string,
): Promise<LibraryWorkMeta | null> {
  const [gitWorks, importedWorks] = await Promise.all([
    loadGitCatalog(),
    loadImportedCatalog(),
  ]);
  const merged = mergeWorks(gitWorks, importedWorks);
  const work = merged.find((w) => w.id === slug);
  if (!work || work.status !== "ready") return null;

  const importedMeta = await readJsonFile<LibraryWorkMeta>(
    path.join(getImportedLibraryRoot(), slug, "meta.json"),
  );
  if (importedMeta) return { ...work, ...importedMeta };

  return work;
}

export function resolveLibraryPdfPath(slug: string): string | null {
  const importedPath = path.join(getImportedLibraryRoot(), slug, "book.pdf");
  return importedPath;
}
