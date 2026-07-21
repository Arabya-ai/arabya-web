import { NextResponse } from "next/server";
import { sanitizeSearchQuery } from "@/lib/api-query";
import { findRootByQuery, searchAyahs } from "@/lib/quran";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = sanitizeSearchQuery(searchParams.get("q"));

  if (!q) {
    return NextResponse.json(
      { query: "", hits: [], root: null },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  }

  const [hits, rootEntry] = await Promise.all([
    searchAyahs(q, 30),
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
    { query: q, hits, root },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
