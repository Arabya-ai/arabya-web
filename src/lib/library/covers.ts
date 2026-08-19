import fs from "node:fs";
import path from "node:path";
import {
  getImportedLibraryRoot,
  gitLibraryCoversDir,
  gitLibraryMediaDir,
} from "@/lib/library/paths";
import type { LibraryWorkMeta } from "@/lib/library/types";

export function importedCoverPath(slug: string): string {
  return path.join(getImportedLibraryRoot(), slug, "cover.png");
}

export function gitCoverPath(slug: string): string {
  return path.join(gitLibraryCoversDir(), `${slug}.png`);
}

export function gitPdfPath(slug: string): string {
  return path.join(gitLibraryMediaDir(), `${slug}.pdf`);
}

export function coverUrlForWork(work: Pick<LibraryWorkMeta, "id" | "coverUrl">): string | undefined {
  if (work.coverUrl) return work.coverUrl;
  try {
    if (fs.existsSync(importedCoverPath(work.id))) {
      return `/api/library/${work.id}/cover`;
    }
    if (fs.existsSync(gitCoverPath(work.id))) {
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
