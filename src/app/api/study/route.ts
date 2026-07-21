import { NextResponse } from "next/server";
import { sanitizeSearchQuery } from "@/lib/api-query";
import { runStudyQuery } from "@/lib/study";

/**
 * Study assistant API — local retrieval + brief.
 * Optional LLM mode when ARABYA_LLM_ENABLED=1 (see docs/platform/rag-llm.md).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = sanitizeSearchQuery(searchParams.get("q"));
  const mode = (searchParams.get("mode") ?? "local").trim().slice(0, 32);

  if (!q) {
    return NextResponse.json(
      { error: "أدخل حرفين على الأقل", hits: [], brief: "" },
      { status: 400 },
    );
  }

  const wantAll = searchParams.get("all") === "1";
  const rawLimit = Number(searchParams.get("limit"));
  const limit = wantAll
    ? 80
    : Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), 80)
      : 10;

  const result = await runStudyQuery(q, { limit });

  const llmEnabled =
    process.env.ARABYA_LLM_ENABLED === "1" &&
    Boolean(process.env.ARABYA_LLM_API_KEY);

  if (mode === "llm") {
    if (!llmEnabled) {
      return NextResponse.json(
        {
          ...result,
          mode: "local-study-brief",
          llm: {
            enabled: false,
            note: "وضع LLM غير مفعّل. عيّن ARABYA_LLM_ENABLED=1 و ARABYA_LLM_API_KEY.",
          },
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
          },
        },
      );
    }

    return NextResponse.json(
      {
        ...result,
        mode: "llm-ready-stub",
        llm: {
          enabled: true,
          answer: null,
          note: "المزوّد غير موصول بعد — الاسترجاع المحلي متاح أدناه مع استشهادات الآية.",
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
