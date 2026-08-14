import { NextResponse } from "next/server";
import { getMushafPage } from "@/lib/mushaf";
import { loadMushafPageStudy } from "@/lib/mushaf-page-study";
import { enforceRateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ page: string }> };

/** Page-scoped study payload — kept off the initial HTML for faster LCP. */
export async function GET(req: Request, { params }: Params) {
  const limited = enforceRateLimit(req, { prefix: "mushaf-study", limit: 60 });
  if (limited) return limited;
  const { page: pageRaw } = await params;
  const pageNum = Number(pageRaw);
  if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > 604) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const pageContent = await getMushafPage(pageNum);
  if (!pageContent) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const payload = await loadMushafPageStudy(pageContent);
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
