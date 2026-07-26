/** Same-origin media proxy helpers for Pexels (and Vimeo-hosted Pexels videos). */

const PEXELS_SUFFIX = ".pexels.com";

/** Hosts allowed as the *starting* URL (user-facing / from API). */
export function isAllowedStudioMediaUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host === "pexels.com" || host.endsWith(PEXELS_SUFFIX)) return true;
    // Pexels API serves video files via Vimeo player URLs.
    if (host === "player.vimeo.com" && u.pathname.includes("/external/")) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Redirect targets after a trusted start URL (Vimeo → Akamai/CDN).
 * Only https; never used as an initial user-supplied URL by itself.
 */
export function isAllowedStudioMediaRedirect(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    if (isAllowedStudioMediaUrl(raw)) return true;
    const host = u.hostname.toLowerCase();
    if (host.endsWith(".vimeocdn.com")) return true;
    if (host.endsWith(".akamaized.net")) return true;
    if (host.endsWith(".vimeo.com")) return true;
    // Newer Pexels CDN paths
    if (host === "videos.pexels.com" || host.endsWith(".pexels.com")) return true;
    return false;
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
