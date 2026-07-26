import { auth } from "@/auth";
import { parseApiKeys, shouldRotateApiKey } from "@/lib/api-keys";

export const runtime = "nodejs";

/**
 * Server-side Pexels proxy with multi-key failover.
 *
 * Keys (tried in order; rotate on 401/403/429/402):
 * 1. `X-Pexels-Key` header (from /studio/settings) — one or many
 * 2. `PEXELS_API_KEY` and/or `PEXELS_API_KEYS` env (comma-separated OK)
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "auth_required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("type") === "videos" ? "videos" : "photos";
  const query = (searchParams.get("query") || "").trim();
  if (!query) {
    return Response.json({ error: "missing_query" }, { status: 400 });
  }

  const keys = parseApiKeys(
    request.headers.get("x-pexels-key") ?? undefined,
    process.env.PEXELS_API_KEY,
    process.env.PEXELS_API_KEYS,
  );
  if (keys.length === 0) {
    return Response.json({ error: "missing_pexels_key" }, { status: 400 });
  }

  const params = new URLSearchParams({
    query,
    per_page: searchParams.get("per_page") || (kind === "videos" ? "12" : "18"),
    page: searchParams.get("page") || "1",
  });
  const orientation = searchParams.get("orientation");
  if (
    orientation === "landscape" ||
    orientation === "portrait" ||
    orientation === "square"
  ) {
    params.set("orientation", orientation);
  }

  const url =
    kind === "videos"
      ? `https://api.pexels.com/videos/search?${params}`
      : `https://api.pexels.com/v1/search?${params}`;

  let lastStatus = 0;
  let lastDetail = "";

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    let upstream: Response;
    try {
      upstream = await fetch(url, {
        headers: { Authorization: key },
      });
    } catch {
      lastStatus = 502;
      lastDetail = "upstream_unreachable";
      continue;
    }

    const text = await upstream.text();
    if (upstream.ok) {
      return new Response(text, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=120",
          "X-Pexels-Key-Index": String(i),
        },
      });
    }

    lastStatus = upstream.status;
    lastDetail = text.slice(0, 200);
    if (!shouldRotateApiKey(upstream.status)) {
      break;
    }
  }

  return Response.json(
    {
      error: "pexels_http",
      status: lastStatus,
      detail: lastDetail,
      keysTried: keys.length,
    },
    {
      status:
        lastStatus === 401 || lastStatus === 403 || lastStatus === 429
          ? 400
          : 502,
    },
  );
}
