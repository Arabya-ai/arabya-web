import { NextResponse } from "next/server";
import { searchAyahs } from "@/lib/quran";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const hits = await searchAyahs(q, 30);
  return NextResponse.json(
    { query: q, hits },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
