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

/** Reject `../`, absolute, or otherwise unsafe library slug segments. */
const SAFE_LIBRARY_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,127}$/i;

export function isSafeLibrarySlug(slug: string): boolean {
  if (!slug || typeof slug !== "string") return false;
  if (slug.includes("\0") || slug.includes("/") || slug.includes("\\")) {
    return false;
  }
  if (slug === "." || slug === ".." || slug.includes("..")) return false;
  return SAFE_LIBRARY_SLUG_RE.test(slug);
}

/**
 * Resolve a path under `root` for a library slug + relative parts.
 * Returns null when the slug is unsafe or the resolved path escapes `root`.
 */
export function resolveContainedLibraryPath(
  root: string,
  slug: string,
  ...parts: string[]
): string | null {
  if (!isSafeLibrarySlug(slug)) return null;
  for (const part of parts) {
    if (
      !part ||
      part.includes("\0") ||
      part.includes("/") ||
      part.includes("\\") ||
      part === ".." ||
      part.includes("..")
    ) {
      return null;
    }
  }
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, slug, ...parts);
  const rel = path.relative(resolvedRoot, resolved);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return resolved;
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
