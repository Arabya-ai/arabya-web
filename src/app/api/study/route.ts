import { NextResponse } from "next/server";
import { sanitizeSearchQuery } from "@/lib/api-query";
import { enforceRateLimit } from "@/lib/rate-limit";
import { runStudyQuery } from "@/lib/study";

/**
 * Study assistant API — local retrieval + brief.
 * Optional LLM mode when ARABYA_LLM_ENABLED=1 (see docs/platform/rag-llm.md).
 */
export async function GET(req: Request) {
  const limited = enforceRateLimit(req, { prefix: "study", limit: 60 });
  if (limited) return limited;
  const { searchParams } = new URL(req.url);
  const q = sanitizeSearchQuery(searchParams.get("q"));
  const mode = (searchParams.get("mode") ?? "local").trim().slice(0, 32);
  const locale = searchParams.get("locale") === "en" ? "en" : "ar";

  if (!q) {
    return NextResponse.json(
      {
        error:
          locale === "en"
            ? "Enter at least two characters"
            : "أدخل حرفين على الأقل",
        hits: [],
        brief: "",
      },
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

  const result = await runStudyQuery(q, { limit, locale });

  const llmEnabled =
    process.env.ARABYA_LLM_ENABLED === "1" &&
    Boolean(process.env.ARABYA_LLM_API_KEY);

  if (mode === "llm") {
    if (!llmEnabled) {
      return NextResponse.json(
        {
          ...result,
          mode: "local-retrieval",
          assistant: "local",
          llm: {
            enabled: false,
            note:
              locale === "en"
                ? "Local retrieval only (no language model). Results cite ayahs and local tafsir snippets — not a fatwa."
                : "استرجاع محلي فقط (بدون نموذج لغوي). النتائج تستشهد بالآيات ومقتطفات التفسير المحلي — وليست فتوى.",
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
        mode: "local-retrieval",
        assistant: "local",
        llm: {
          enabled: true,
          answer: null,
          note:
            locale === "en"
              ? "Provider not wired yet — local retrieval with ayah citations is below. Not a fatwa."
              : "المزوّد غير موصول بعد — الاسترجاع المحلي متاح أدناه مع استشهادات الآية. ليست فتوى.",
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return NextResponse.json(
    {
      ...result,
      mode: "local-retrieval",
      assistant: "local",
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
      },
    },
  );
}
