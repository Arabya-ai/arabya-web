/** Same-origin media proxy helpers for Pexels, Pixabay, and related CDNs. */

const PEXELS_SUFFIX = ".pexels.com";
const PIXABAY_SUFFIX = ".pixabay.com";

function isIpv4Literal(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function isPrivateOrLocalHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h === "0.0.0.0") {
    return true;
  }
  if (h === "::1" || h.startsWith("[")) return true;
  if (!isIpv4Literal(h)) return false;
  const parts = h.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n > 255)) {
    return true;
  }
  const [a, b] = parts as [number, number, number, number];
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isPexelsHost(host: string): boolean {
  return host === "pexels.com" || host.endsWith(PEXELS_SUFFIX);
}

function isPixabayHost(host: string): boolean {
  return host === "pixabay.com" || host.endsWith(PIXABAY_SUFFIX);
}

function assertSafeMediaUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    if (!host || isPrivateOrLocalHost(host) || isIpv4Literal(host)) return null;
    if (u.username || u.password) return null;
    return u;
  } catch {
    return null;
  }
}

/** Hosts allowed as the *starting* URL (user-facing / from API). */
export function isAllowedStudioMediaUrl(raw: string): boolean {
  const u = assertSafeMediaUrl(raw);
  if (!u) return false;
  const host = u.hostname.toLowerCase();
  if (isPexelsHost(host)) return true;
  if (isPixabayHost(host)) return true;
  // Pexels API serves video files via Vimeo player URLs.
  if (host === "player.vimeo.com" && u.pathname.includes("/external/")) return true;
  // Pixabay video posters historically use Vimeo CDN stills.
  if (host === "i.vimeocdn.com") return true;
  return false;
}

/**
 * Redirect targets after a trusted start URL (Vimeo → Akamai/CDN).
 * Only https; never used as an initial user-supplied URL by itself.
 */
export function isAllowedStudioMediaRedirect(raw: string): boolean {
  const u = assertSafeMediaUrl(raw);
  if (!u) return false;
  if (isAllowedStudioMediaUrl(raw)) return true;
  const host = u.hostname.toLowerCase();
  if (host.endsWith(".vimeocdn.com")) return true;
  if (host.endsWith(".akamaized.net")) return true;
  if (host.endsWith(".vimeo.com")) return true;
  if (isPexelsHost(host) || isPixabayHost(host)) return true;
  return false;
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
