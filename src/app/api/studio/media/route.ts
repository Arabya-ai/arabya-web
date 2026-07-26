import { auth } from "@/auth";
import {
  isAllowedStudioMediaRedirect,
  isAllowedStudioMediaUrl,
  studioMediaReferer,
} from "@/ayat-studio/lib/media-url";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_REDIRECTS = 6;

/**
 * Authenticated media proxy for Pexels / Pixabay (and related CDNs).
 * Forwards Range requests so video seeking works during MP4 export.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "auth_required" }, { status: 401 });
  }

  const raw = new URL(request.url).searchParams.get("url")?.trim() || "";
  if (!raw || !isAllowedStudioMediaUrl(raw)) {
    return Response.json({ error: "url_not_allowed" }, { status: 400 });
  }

  const range = request.headers.get("range") || undefined;
  let current = raw;

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    let upstream: Response;
    try {
      const headers: HeadersInit = {
        Accept: "*/*",
        "User-Agent":
          "Mozilla/5.0 (compatible; ArabyaStudio/1.0; +https://www.arabyaai.com)",
        Referer: studioMediaReferer(current),
      };
      if (range) headers.Range = range;
      upstream = await fetch(current, { redirect: "manual", headers });
    } catch {
      return Response.json({ error: "upstream_unreachable" }, { status: 502 });
    }

    if (upstream.status >= 300 && upstream.status < 400) {
      const loc = upstream.headers.get("location");
      if (!loc) {
        return Response.json({ error: "redirect_missing" }, { status: 502 });
      }
      const next = new URL(loc, current).href;
      if (!isAllowedStudioMediaRedirect(next)) {
        return Response.json(
          { error: "redirect_blocked", host: new URL(next).hostname },
          { status: 400 },
        );
      }
      current = next;
      continue;
    }

    if ((!upstream.ok && upstream.status !== 206) || !upstream.body) {
      return Response.json(
        { error: "upstream_http", status: upstream.status },
        { status: 502 },
      );
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";
    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
    });
    const contentLength = upstream.headers.get("content-length");
    const contentRange = upstream.headers.get("content-range");
    if (contentLength) headers.set("Content-Length", contentLength);
    if (contentRange) headers.set("Content-Range", contentRange);

    return new Response(upstream.body, {
      status: upstream.status === 206 ? 206 : 200,
      headers,
    });
  }

  return Response.json({ error: "too_many_redirects" }, { status: 502 });
}
