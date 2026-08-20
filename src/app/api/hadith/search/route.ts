import { NextResponse } from "next/server";
import { sanitizeSearchQuery } from "@/lib/api-query";
import { searchHadith } from "@/lib/hadith";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, { prefix: "hadith-search", limit: 60 });
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const q = sanitizeSearchQuery(searchParams.get("q"));
  const collection = (searchParams.get("collection") || "")
    .replace(/[^a-z0-9-]/gi, "")
    .slice(0, 40);
  const rawLimit = Number(searchParams.get("limit"));
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), 100)
      : 20;

  if (!q) {
    return NextResponse.json({ query: "", hits: [], total: 0 });
  }

  const result = await searchHadith(q, {
    limit,
    collection: collection || undefined,
  });

  return NextResponse.json(
    { query: q, hits: result.hits, total: result.total },
    {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
      },
    },
  );
}
