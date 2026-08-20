import { NextResponse } from "next/server";
import { lughawiMaxGuestChars } from "@/lib/lughawi/config";
import { proofreadLocal } from "@/lib/lughawi/pipeline";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { prefix: "lughawi-proofread", limit: 40 });
  if (limited) return limited;

  let body: { text?: string; locale?: string; mode?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text : "";
  const locale = body.locale === "en" ? "en" : "ar";
  const max = lughawiMaxGuestChars();

  if (!text.trim()) {
    return NextResponse.json(
      { error: locale === "en" ? "Enter some text" : "أدخل نصًا للتدقيق" },
      { status: 400 },
    );
  }
  if (text.length > max) {
    return NextResponse.json(
      {
        error:
          locale === "en"
            ? `Text exceeds the ${max} character limit`
            : `النص أطول من الحد المسموح (${max} حرفًا)`,
      },
      { status: 400 },
    );
  }

  const result = proofreadLocal(text, { locale, mode: "proofread" });
  return NextResponse.json(result);
}
