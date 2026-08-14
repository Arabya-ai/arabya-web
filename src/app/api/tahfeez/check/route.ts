import { NextResponse } from "next/server";
import { alignRecitation } from "@/lib/tahfeez/align";
import { enforceRateLimitKey } from "@/lib/rate-limit";
import { requireSession } from "@/lib/require-role";

export const dynamic = "force-dynamic";

/**
 * Constrained Hifz alignment — client sends ASR hypothesis text + expected words.
 * Free path: browser speech recognition → this endpoint (no paid ASR keys).
 */
export async function POST(request: Request) {
  const gate = await requireSession();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("tahfeez-check", gate.email, 120);
  if (limited) return limited;

  let body: {
    expectedWords?: string[];
    hypothesis?: string;
    cursor?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const expectedWords = Array.isArray(body.expectedWords)
    ? body.expectedWords.map(String).slice(0, 400)
    : [];
  const hypothesis = String(body.hypothesis || "").slice(0, 4000);
  if (expectedWords.length === 0) {
    return NextResponse.json(
      { ok: false, error: "missing_expected" },
      { status: 400 },
    );
  }

  const aligned = alignRecitation(expectedWords, hypothesis, {
    cursor: Number.isFinite(body.cursor) ? Number(body.cursor) : 0,
  });

  return NextResponse.json({ ok: true, ...aligned });
}
