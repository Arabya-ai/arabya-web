import { auth } from "@/auth";

export const runtime = "nodejs";

/**
 * Server-side Pexels proxy.
 * Key: `X-Pexels-Key` from client settings, or `PEXELS_API_KEY` env.
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

  const headerKey = request.headers.get("x-pexels-key")?.trim() || "";
  const envKey = (process.env.PEXELS_API_KEY || "").trim();
  const key = headerKey || envKey;
  if (!key) {
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

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      headers: { Authorization: key },
    });
  } catch {
    return Response.json({ error: "upstream_unreachable" }, { status: 502 });
  }

  const text = await upstream.text();
  if (!upstream.ok) {
    return Response.json(
      {
        error: "pexels_http",
        status: upstream.status,
        detail: text.slice(0, 200),
      },
      { status: upstream.status === 401 || upstream.status === 403 ? 400 : 502 },
    );
  }

  return new Response(text, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=120",
    },
  });
}
