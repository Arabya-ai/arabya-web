/** Same-origin media proxy helpers for Pexels (and similar) backgrounds. */

const PROXY_HOST_SUFFIXES = [".pexels.com"] as const;

export function isProxiedMediaHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return PROXY_HOST_SUFFIXES.some(
    (suffix) => host === suffix.slice(1) || host.endsWith(suffix),
  );
}

export function isAllowedStudioMediaUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    return isProxiedMediaHost(u.hostname);
  } catch {
    return false;
  }
}

/** Rewrite remote CDN URLs through our authenticated proxy for preview + canvas export. */
export function studioMediaUrl(src: string): string {
  if (!src) return src;
  if (
    src.startsWith("data:") ||
    src.startsWith("blob:") ||
    src.startsWith("/") ||
    src.startsWith("#")
  ) {
    return src;
  }
  if (!isAllowedStudioMediaUrl(src)) return src;
  return `/api/studio/media?url=${encodeURIComponent(src)}`;
}
