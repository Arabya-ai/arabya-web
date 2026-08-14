import { parseApiKeys, shouldRotateApiKey } from "@/lib/api-keys";
import { enforceRateLimitKey } from "@/lib/rate-limit";
import { requireSession } from "@/lib/require-role";

export const runtime = "nodejs";

/**
 * Server-side Pixabay proxy with multi-key failover.
 *
 * Keys (tried in order; rotate on 401/403/429/402):
 * 1. `X-Pixabay-Key` header (from /studio/settings) — one or many
 * 2. `PIXABAY_API_KEY` and/or `PIXABAY_API_KEYS` env (comma-separated OK)
 *
 * Separate from Pexels so keys, rate limits, and errors never mix.
 */
export async function GET(request: Request) {
  const gate = await requireSession();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("studio-pixabay", gate.email, 60);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("type") === "videos" ? "videos" : "photos";
  const query = (searchParams.get("query") || "").trim();
  if (!query) {
    return Response.json({ error: "missing_query" }, { status: 400 });
  }

  const keys = parseApiKeys(
    request.headers.get("x-pixabay-key") ?? undefined,
    process.env.PIXABAY_API_KEY,
    process.env.PIXABAY_API_KEYS,
  );
  if (keys.length === 0) {
    return Response.json({ error: "missing_pixabay_key" }, { status: 400 });
  }

  const perPage = searchParams.get("per_page") || (kind === "videos" ? "12" : "18");
  const page = searchParams.get("page") || "1";
  const orientationRaw = searchParams.get("orientation");
  // Pixabay: horizontal | vertical | all (no square)
  let orientation = "all";
  if (orientationRaw === "landscape") orientation = "horizontal";
  else if (orientationRaw === "portrait") orientation = "vertical";
  else if (orientationRaw === "horizontal" || orientationRaw === "vertical") {
    orientation = orientationRaw;
  }

  let lastStatus = 0;
  let lastDetail = "";

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const params = new URLSearchParams({
      key,
      q: query,
      per_page: perPage,
      page,
      safesearch: "true",
    });
    if (kind === "photos") {
      params.set("image_type", "photo");
      if (orientation !== "all") params.set("orientation", orientation);
    } else if (orientation !== "all") {
      // Videos API also accepts orientation in recent docs; ignore if upstream rejects.
      params.set("orientation", orientation);
    }

    const url =
      kind === "videos"
        ? `https://pixabay.com/api/videos/?${params}`
        : `https://pixabay.com/api/?${params}`;

    let upstream: Response;
    try {
      upstream = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (compatible; ArabyaStudio/1.0; +https://www.arabya.org)",
        },
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
          "X-Pixabay-Key-Index": String(i),
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
      error: "pixabay_http",
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
