import { auth } from "@/auth";
import { isAllowedStudioMediaUrl } from "@/ayat-studio/lib/media-url";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_REDIRECTS = 4;

/**
 * Authenticated media proxy for Pexels CDN assets.
 * Same-origin URLs let the editor preview and WebCodecs canvas use backgrounds without CORS failures.
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

  let current = raw;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    let upstream: Response;
    try {
      upstream = await fetch(current, {
        redirect: "manual",
        headers: {
          Accept: "*/*",
          "User-Agent": "ArabyaStudioMediaProxy/1.0",
        },
      });
    } catch {
      return Response.json({ error: "upstream_unreachable" }, { status: 502 });
    }

    if (upstream.status >= 300 && upstream.status < 400) {
      const loc = upstream.headers.get("location");
      if (!loc) {
        return Response.json({ error: "redirect_missing" }, { status: 502 });
      }
      const next = new URL(loc, current).href;
      if (!isAllowedStudioMediaUrl(next)) {
        return Response.json({ error: "redirect_blocked" }, { status: 400 });
      }
      current = next;
      continue;
    }

    if (!upstream.ok || !upstream.body) {
      return Response.json(
        { error: "upstream_http", status: upstream.status },
        { status: 502 },
      );
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";
    const contentLength = upstream.headers.get("content-length");
    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    });
    if (contentLength) headers.set("Content-Length", contentLength);

    return new Response(upstream.body, { status: 200, headers });
  }

  return Response.json({ error: "too_many_redirects" }, { status: 502 });
}
