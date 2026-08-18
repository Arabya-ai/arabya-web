/** MoneyPrinterTurbo engine helpers — origin, SSRF-safe URLs, asset rewrite. */

export const MPT_FILES_PREFIX = "/api/studio/ai/files";

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
