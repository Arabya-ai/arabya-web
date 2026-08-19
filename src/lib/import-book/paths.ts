import fs from "node:fs";
import path from "node:path";
import { isLocalUserSyncEnabled } from "@/lib/local-user-db";

/** Persistent owner imports (survives git deploy on Contabo). */
export function getImportedBooksRoot(): string {
  const fromEnv = process.env.ARABYA_IMPORTED_BOOKS_DIR?.trim();
  if (fromEnv) return fromEnv;
  if (isLocalUserSyncEnabled()) {
    return "/var/lib/arabya/imported-books";
  }
  return path.join(process.cwd(), "data", "imported-books");
}

export function getImportedClaimsRoot(): string {
  return path.join(getImportedBooksRoot(), "irab-claims");
}

export function ensureImportedBooksRoot(): string {
  const root = getImportedBooksRoot();
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(getImportedClaimsRoot(), { recursive: true });
  return root;
}
