/** MoneyPrinterTurbo engine helpers — origin, SSRF-safe URLs, asset rewrite. */

import path from "node:path";

export const MPT_FILES_PREFIX = "/api/studio/ai/files";
export const MPT_THUMB_MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export function getMptApiBase(): string | null {
  const raw = process.env.MONEYPRINTER_API_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null;
    if (url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Join a path onto the configured engine origin (rejects traversal / open redirects). */
export function joinMptUrl(base: string, pathAndQuery: string): URL {
  const origin = new URL(base).origin;
  if (!pathAndQuery.startsWith("/")) {
    throw new Error("invalid_mpt_path");
  }
  const pathnameOnly = pathAndQuery.split("?")[0] || "";
  if (
    pathnameOnly.includes("\\") ||
    pathnameOnly.includes("//") ||
    pathnameOnly.includes("..")
  ) {
    throw new Error("invalid_mpt_path");
  }
  const url = new URL(pathAndQuery, origin);
  if (url.origin !== origin) {
    throw new Error("invalid_mpt_path");
  }
  return url;
}

export function isAllowedMptApiPath(pathname: string): boolean {
  return (
    pathname === "/api/v1/videos" ||
    pathname === "/api/v1/scripts" ||
    pathname === "/api/v1/terms" ||
    pathname === "/api/v1/social-metadata" ||
    pathname === "/api/v1/tasks" ||
    pathname === "/api/v1/musics" ||
    pathname === "/api/v1/video_materials" ||
    /^\/api\/v1\/tasks\/[A-Za-z0-9_-]+$/.test(pathname)
  );
}

/** Relative path under MPT `/tasks` (task id + filename). */
export function isSafeMptFilePath(parts: string[]): boolean {
  if (parts.length < 1 || parts.length > 6) return false;
  return parts.every(
    (part) =>
      part.length > 0 &&
      part.length <= 180 &&
      part !== "." &&
      part !== ".." &&
      /^[A-Za-z0-9._-]+$/.test(part),
  );
}

function rewriteAssetString(value: string): string {
  const files = MPT_FILES_PREFIX;
  if (/^https?:\/\/[^/]+\/tasks\//i.test(value)) {
    return value.replace(/^https?:\/\/[^/]+\/tasks\//i, `${files}/`);
  }
  if (value.startsWith("/tasks/")) {
    return `${files}/${value.slice("/tasks/".length)}`;
  }
  const storageIdx = value.indexOf("/storage/tasks/");
  if (storageIdx !== -1) {
    const rest = value.slice(storageIdx + "/storage/tasks/".length);
    const parts = rest.split("/").filter(Boolean);
    if (isSafeMptFilePath(parts)) {
      return `${files}/${parts.join("/")}`;
    }
  }
  return value;
}

/** Rewrite engine file URLs so the browser only talks to Arabya. */
export function rewriteMptValue(value: unknown): unknown {
  if (typeof value === "string") return rewriteAssetString(value);
  if (Array.isArray(value)) return value.map(rewriteMptValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = rewriteMptValue(nested);
    }
    return out;
  }
  return value;
}

export function mptTaskFileUrl(relative: string): string {
  const trimmed = relative.replace(/^\/+/, "");
  return `${MPT_FILES_PREFIX}/${trimmed}`;
}

export function isSafeMaterialFilename(name: string): boolean {
  return (
    name.length > 0 &&
    name.length <= 180 &&
    name !== "." &&
    name !== ".." &&
    !name.includes("/") &&
    !name.includes("\\") &&
    /^[A-Za-z0-9._-]+$/.test(name)
  );
}

export function mptMaterialImageContentType(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return null;
}

export function resolveMptLocalVideosDir(): string {
  const fromEnv = process.env.MPT_LOCAL_VIDEOS_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.resolve(
    process.cwd(),
    "services/money-printer-turbo/storage/local_videos",
  );
}

/** Absolute path inside the engine local-videos folder, or null if unsafe. */
export function resolveMptLocalVideoFile(filename: string): string | null {
  if (!isSafeMaterialFilename(filename)) return null;
  const dir = resolveMptLocalVideosDir();
  const resolved = path.resolve(dir, filename);
  const relative = path.relative(dir, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return resolved;
}
