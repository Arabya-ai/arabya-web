import fs from "node:fs";
import path from "node:path";
import {
  getImportedLibraryRoot,
  gitLibraryCoversDir,
  gitLibraryMediaDir,
  isSafeLibrarySlug,
  resolveContainedLibraryPath,
} from "@/lib/library/paths";
import type { LibraryWorkMeta } from "@/lib/library/types";

export function importedCoverPath(slug: string): string | null {
  return resolveContainedLibraryPath(
    getImportedLibraryRoot(),
    slug,
    "cover.png",
  );
}

export function gitCoverPath(slug: string): string | null {
  if (!isSafeLibrarySlug(slug)) return null;
  return path.join(gitLibraryCoversDir(), `${slug}.png`);
}

export function gitPdfPath(slug: string): string | null {
  if (!isSafeLibrarySlug(slug)) return null;
  return path.join(gitLibraryMediaDir(), `${slug}.pdf`);
}

export function coverUrlForWork(work: Pick<LibraryWorkMeta, "id" | "coverUrl">): string | undefined {
  if (work.coverUrl) return work.coverUrl;
  try {
    const imported = importedCoverPath(work.id);
    if (imported && fs.existsSync(imported)) {
      return `/api/library/${work.id}/cover`;
    }
    const gitCover = gitCoverPath(work.id);
    if (gitCover && fs.existsSync(gitCover)) {
      return `/media/library/covers/${work.id}.png`;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export function withResolvedCover<T extends LibraryWorkMeta>(work: T): T {
  const coverUrl = coverUrlForWork(work);
  return coverUrl ? { ...work, coverUrl } : work;
}
