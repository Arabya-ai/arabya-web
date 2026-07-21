import { NextResponse } from "next/server";
import { sanitizeSearchQuery } from "@/lib/api-query";
import { findRootByQuery, searchAyahs } from "@/lib/quran";

const PREVIEW_LIMIT = 10;
const ALL_CAP = 5000;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = sanitizeSearchQuery(searchParams.get("q"));
  const wantAll = searchParams.get("all") === "1";
  const rawLimit = Number(searchParams.get("limit"));
  const limit = wantAll
    ? ALL_CAP
    : Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), ALL_CAP)
      : PREVIEW_LIMIT;

  if (!q) {
    return NextResponse.json(
      { query: "", hits: [], total: 0, root: null },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  }

  const [result, rootEntry] = await Promise.all([
    searchAyahs(q, { limit }),
    findRootByQuery(q),
  ]);

  const root = rootEntry
    ? {
        root: rootEntry.root,
        count: rootEntry.count,
        href: `/root/${encodeURIComponent(rootEntry.root)}`,
      }
    : null;

  return NextResponse.json(
    {
      query: q,
      hits: result.hits,
      total: result.total,
      root,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
