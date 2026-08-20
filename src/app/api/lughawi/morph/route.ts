import { NextResponse } from "next/server";
import { sidecarMorph } from "@/lib/lughawi/sidecar-client";
import { enforceRateLimit } from "@/lib/rate-limit";

/** Optional morphology peek via Contabo sidecar (heuristic until CAMeL). */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { prefix: "lughawi-morph", limit: 40 });
  if (limited) return limited;

  let body: { text?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "أدخل نصًا" }, { status: 400 });
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: "النص طويل للمعاينة الصرفية" }, { status: 400 });
  }

  const morph = await sidecarMorph(text);
  if (!morph) {
    return NextResponse.json(
      {
        ok: false,
        error: "sidecar_offline",
        messageAr:
          "خدمة الصرف غير متصلة. التدقيق المحلي يعمل؛ شغّل sidecar على Contabo لاحقًا.",
      },
      { status: 503 },
    );
  }
  return NextResponse.json({
    ok: true,
    engine: morph.engine,
    tokens: morph.tokens,
  });
}
