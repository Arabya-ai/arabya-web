import { NextResponse } from "next/server";
import { runStudyQuery } from "@/lib/study";

/**
 * Study assistant API — local retrieval + brief explanation.
 * No LLM calls; uses Git-hosted Quran data + Muyassar snippets.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json(
      { error: "أدخل حرفين على الأقل", hits: [], brief: "" },
      { status: 400 },
    );
  }

  const result = await runStudyQuery(q, 6);

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
