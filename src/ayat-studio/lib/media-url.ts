/** Same-origin media proxy helpers for Pexels, Pixabay, and related CDNs. */

const PEXELS_SUFFIX = ".pexels.com";
const PIXABAY_SUFFIX = ".pixabay.com";

function isPexelsHost(host: string): boolean {
  return host === "pexels.com" || host.endsWith(PEXELS_SUFFIX);
}

function isPixabayHost(host: string): boolean {
  return host === "pixabay.com" || host.endsWith(PIXABAY_SUFFIX);
}

/** Hosts allowed as the *starting* URL (user-facing / from API). */
export function isAllowedStudioMediaUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (isPexelsHost(host)) return true;
    if (isPixabayHost(host)) return true;
    // Pexels API serves video files via Vimeo player URLs.
    if (host === "player.vimeo.com" && u.pathname.includes("/external/")) return true;
    // Pixabay video posters historically use Vimeo CDN stills.
    if (host === "i.vimeocdn.com") return true;
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
    if (isPexelsHost(host) || isPixabayHost(host)) return true;
    return false;
  } catch {
    return false;
  }
}

/** Prefer a polite Referer matching the CDN origin when proxying. */
export function studioMediaReferer(raw: string): string {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    if (isPixabayHost(host) || host === "i.vimeocdn.com") {
      return "https://pixabay.com/";
    }
  } catch {
    /* fall through */
  }
  return "https://www.pexels.com/";
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
