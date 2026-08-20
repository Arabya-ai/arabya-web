import { NextResponse } from "next/server";
import { enrichHadithToken } from "@/lib/hadith-word-enrich";

export const runtime = "nodejs";

export async function GET(req: Request) {
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
