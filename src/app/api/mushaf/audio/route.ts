import { getReciter, RECITERS } from "@/lib/audio";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function pad(n: number, width: number): string {
  return n.toString().padStart(width, "0");
}

/**
 * Public EveryAyah proxy for mushaf ayah/surah playback.
 * Same-origin avoids intermittent CDN / mixed-content issues on mobile browsers.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folder = (searchParams.get("folder") || "").trim();
  const sid = Number(searchParams.get("s") || "0");
  const vid = Number(searchParams.get("v") || "0");

  const byFolder = RECITERS.find((r) => r.folder === folder);
  const known = getReciter(byFolder?.id ?? folder);
  if (!known || known.folder !== folder) {
    return NextResponse.json({ error: "bad_reciter" }, { status: 400 });
  }
  if (
    !Number.isInteger(sid) ||
    sid < 1 ||
    sid > 114 ||
    !Number.isInteger(vid) ||
    vid < 1
  ) {
    return NextResponse.json({ error: "bad_verse" }, { status: 400 });
  }

  const remote = `https://everyayah.com/data/${folder}/${pad(sid, 3)}${pad(vid, 3)}.mp3`;
  let upstream: Response;
  try {
    upstream = await fetch(remote, {
      headers: { Accept: "audio/mpeg,*/*" },
      cache: "force-cache",
    });
  } catch {
    return NextResponse.json({ error: "upstream_unreachable" }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
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
