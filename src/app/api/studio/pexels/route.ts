import { parseApiKeys, shouldRotateApiKey } from "@/lib/api-keys";
import { enforceRateLimitKey } from "@/lib/rate-limit";
import { requireSession } from "@/lib/require-role";

export const runtime = "nodejs";

/**
 * Server-side Pexels proxy with multi-key failover (server env keys only).
 *
 * Keys (tried in order; rotate on 401/403/429/402):
 * - `PEXELS_API_KEY` and/or `PEXELS_API_KEYS` env (comma-separated OK)
 *
 * Client-supplied keys are ignored (do not send secrets from the browser).
 */
export async function GET(request: Request) {
  const gate = await requireSession();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("studio-pexels", gate.email, 60);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("type") === "videos" ? "videos" : "photos";
  const query = (searchParams.get("query") || "").trim();
  if (!query) {
    return Response.json({ error: "missing_query" }, { status: 400 });
  }

  const keys = parseApiKeys(
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

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    let upstream: Response;
    try {
      upstream = await fetch(url, {
        headers: { Authorization: key },
      });
    } catch {
      lastStatus = 502;
      continue;
    }

    const text = await upstream.text();
    if (upstream.ok) {
      return new Response(text, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=120",
        },
      });
    }

    lastStatus = upstream.status;
    if (!shouldRotateApiKey(upstream.status)) {
      break;
    }
  }

  return Response.json(
    {
      error: "pexels_unavailable",
      status: lastStatus >= 400 ? lastStatus : 502,
    },
    { status: 502 },
  );
}
