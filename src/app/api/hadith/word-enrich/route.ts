import { NextResponse } from "next/server";
import { enrichHadithToken } from "@/lib/hadith-word-enrich";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, {
    prefix: "hadith-word-enrich",
    limit: 60,
  });
  if (limited) return limited;

  const url = new URL(req.url);
  const text = url.searchParams.get("text") || "";
  if (!text.trim()) {
    return NextResponse.json(
      { ok: false, error: "text required" },
      { status: 400 },
    );
  }
  try {
    const enrichment = await enrichHadithToken(text);
    return NextResponse.json({ ok: true, enrichment });
  } catch (err) {
    const message = err instanceof Error ? err.message : "enrich failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
