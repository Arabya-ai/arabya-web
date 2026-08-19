import fs from "node:fs";
import path from "node:path";
import { isLocalUserSyncEnabled } from "@/lib/local-user-db";

/** Persistent owner-uploaded reading books (survives git deploy on Contabo). */
export function getImportedLibraryRoot(): string {
  const fromEnv = process.env.ARABYA_IMPORTED_LIBRARY_DIR?.trim();
  if (fromEnv) return fromEnv;
  if (isLocalUserSyncEnabled()) {
    return "/var/lib/arabya/imported-library";
  }
  return path.join(process.cwd(), "data", "imported-library");
}

export function ensureImportedLibraryRoot(): string {
  const root = getImportedLibraryRoot();
  fs.mkdirSync(root, { recursive: true });
  return root;
}

export function gitLibraryDataRoot(): string {
  return path.join(process.cwd(), "data", "library");
}

export function gitLibraryPublicRoot(): string {
  return path.join(process.cwd(), "public", "library");
}

export function gitLibraryCoversDir(): string {
  return path.join(process.cwd(), "public", "media", "library", "covers");
}

export function gitLibraryMediaDir(): string {
  return path.join(process.cwd(), "public", "media", "library");
}
