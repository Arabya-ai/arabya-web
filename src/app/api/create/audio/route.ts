import { reciters } from "@/ayat-studio/lib/quran-data";
import { enforceRateLimitKey } from "@/lib/rate-limit";
import { requireSession } from "@/lib/require-role";

export const runtime = "nodejs";

const ALLOWED = new Set(reciters.map((r) => r.id));

function pad(n: number, width: number): string {
  return n.toString().padStart(width, "0");
}

/**
 * Proxy EveryAyah MP3 through our origin to avoid browser CORS
 * (direct everyayah.com fetch fails with TypeError: Failed to fetch).
 */
export async function GET(request: Request) {
  const gate = await requireSession();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("create-audio", gate.email, 120);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const folder = (searchParams.get("folder") || "").trim();
  const sid = Number(searchParams.get("s") || "0");
  const vid = Number(searchParams.get("v") || "0");

  if (!ALLOWED.has(folder)) {
    return Response.json({ error: "bad_reciter" }, { status: 400 });
  }
  if (
    !Number.isInteger(sid) ||
    sid < 1 ||
    sid > 114 ||
    !Number.isInteger(vid) ||
    vid < 1
  ) {
    return Response.json({ error: "bad_verse" }, { status: 400 });
  }

  const remote = `https://everyayah.com/data/${folder}/${pad(sid, 3)}${pad(vid, 3)}.mp3`;
  let upstream: Response;
  try {
    upstream = await fetch(remote, {
      headers: { Accept: "audio/mpeg,*/*" },
      cache: "force-cache",
    });
  } catch {
    return Response.json({ error: "upstream_unreachable" }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return Response.json(
      { error: "upstream_http", status: upstream.status },
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
