import { auth } from "@/auth";
import { applyTafqeet } from "@/lib/lughawi/engines/tafqeet";
import { sessionSkipsLughawiRateLimit } from "@/lib/lughawi/rate-limit-policy";
import { enforceRateLimit, LUGHAWI_TOOL_LIMIT } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!sessionSkipsLughawiRateLimit(session)) {
    const limited = enforceRateLimit(req, {
      prefix: "lughawi-tafqeet",
      limit: LUGHAWI_TOOL_LIMIT,
    });
    if (limited) return limited;
  }

  let body: { text?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) {
    return NextResponse.json({ error: "أدخل نصًا" }, { status: 400 });
  }
  const { result, replacements } = applyTafqeet(text);
  return NextResponse.json({
    original: text,
    result,
    edits: replacements.map((r, i) => ({
      id: `tf-${i}`,
      start: 0,
      end: 0,
      type: "other",
      original: r.from,
      suggestion: r.to,
      explanation: "تفقيط الأرقام إلى ألفاظ عربية.",
      confidence: 1,
      source: "rules",
      status: "proposed",
    })),
    protectedSpans: [],
    meta: { engine: "lughawi-tafqeet", usedAi: false, quotaCharged: 0 },
  });
}
