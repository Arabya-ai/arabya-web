import { NextResponse } from "next/server";
import { runStudyQuery } from "@/lib/study";

/**
 * Study assistant API — local retrieval + brief.
 * Optional LLM mode when ARABYA_LLM_ENABLED=1 (see docs/platform/rag-llm.md).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const mode = (searchParams.get("mode") ?? "local").trim();

  if (q.length < 2) {
    return NextResponse.json(
      { error: "أدخل حرفين على الأقل", hits: [], brief: "" },
      { status: 400 },
    );
  }

  const result = await runStudyQuery(q, 6);

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

    // Placeholder: wire provider later; never drop retrieval citations.
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
