import { NextResponse } from "next/server";
import { arabyaNlpConjugate } from "@/lib/lughawi/arabya-nlp-client";
import { sidecarMorph } from "@/lib/lughawi/sidecar-client";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Morphology / conjugation peek.
 * Prefer Contabo arabya-nlp libqutrub for single verbs; else sidecar heuristic.
 * Does not touch mushaf word-study dock.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { prefix: "lughawi-morph", limit: 40 });
  if (limited) return limited;

  let body: { text?: string; verb?: string; futureType?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = (
    typeof body.verb === "string"
      ? body.verb
      : typeof body.text === "string"
        ? body.text
        : ""
  ).trim();
  if (!text) {
    return NextResponse.json({ error: "أدخل نصًا" }, { status: 400 });
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: "النص طويل للمعاينة الصرفية" }, { status: 400 });
  }

  // Single Arabic verb → try Qutrub on Contabo arabya-nlp first.
  const singleVerb = /^[\u0600-\u06FF]{2,12}$/.test(text);
  if (singleVerb) {
    try {
      const conj = await arabyaNlpConjugate(text, {
        futureType: body.futureType,
        timeoutMs: 10_000,
      });
      if (conj?.ok && conj.available && conj.table && Object.keys(conj.table).length) {
        const tokens = Object.entries(conj.table).flatMap(([tense, forms]) => {
          if (forms && typeof forms === "object") {
            return Object.entries(forms).map(([person, form]) => ({
              surface: String(form),
              lemma: text,
              pos: "verb",
              features: { tense, person },
            }));
          }
          return [
            {
              surface: String(forms),
              lemma: text,
              pos: "verb",
              features: { tense },
            },
          ];
        });
        return NextResponse.json({
          ok: true,
            engine: conj.engine || "lughawi-qutrub",
          verb: conj.verb,
          future_type: conj.future_type,
          table: conj.table,
          tokens,
        });
      }
    } catch {
      // Optional — fall through.
    }
  }

  const morph = await sidecarMorph(text);
  if (!morph) {
    return NextResponse.json(
      {
        ok: false,
        error: "sidecar_offline",
        messageAr:
          "خدمة الصرف غير متصلة. التدقيق المحلي يعمل؛ أعد تشغيل محرك لغوي لاحقًا.",
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
