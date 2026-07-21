import { NextResponse } from "next/server";
import { getReciter, type VerseTiming, type WordTimingSegment } from "@/lib/audio";

type UpstreamStamp = {
  verse_key: string;
  timestamp_from: number;
  timestamp_to: number;
  segments?: number[][];
};

function parseSegments(raw: number[][] | undefined): WordTimingSegment[] {
  if (!raw?.length) return [];
  const out: WordTimingSegment[] = [];
  for (const row of raw) {
    if (row.length >= 3) {
      out.push({
        position: row[0],
        startMs: row[1],
        endMs: row[2],
      });
    }
  }
  return out;
}

/**
 * Quran.com chapter audio + word segments for sync highlighting.
 * Cached at the edge; falls back to 404 when reciter has no chapter id.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ reciterId: string; surahId: string }> },
) {
  const { reciterId, surahId: surahRaw } = await ctx.params;
  const surahId = Number(surahRaw);
  const reciter = getReciter(reciterId);
  const chapterReciterId = reciter.quranComChapterReciterId;

  if (
    !chapterReciterId ||
    !Number.isInteger(surahId) ||
    surahId < 1 ||
    surahId > 114
  ) {
    return NextResponse.json(
      { error: "timings_unavailable", reciterId, surahId },
      { status: 404 },
    );
  }

  try {
    const url = `https://api.quran.com/api/v4/chapter_recitations/${chapterReciterId}/${surahId}?segments=true`;
    const res = await fetch(url, {
      next: { revalidate: 86400 * 7 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "upstream", status: res.status },
        { status: 502 },
      );
    }
    const data = (await res.json()) as {
      audio_file?: {
        audio_url?: string;
        timestamps?: UpstreamStamp[];
      };
    };
    const file = data.audio_file;
    if (!file?.audio_url || !file.timestamps?.length) {
      return NextResponse.json({ error: "empty" }, { status: 404 });
    }

    const verses: Record<string, VerseTiming> = {};
    for (const t of file.timestamps) {
      verses[t.verse_key] = {
        verseKey: t.verse_key,
        timestampFrom: t.timestamp_from,
        timestampTo: t.timestamp_to,
        segments: parseSegments(t.segments),
      };
    }

    return NextResponse.json(
      {
        reciterId: reciter.id,
        surahId,
        audioUrl: file.audio_url,
        verses,
        source: "api.quran.com",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
