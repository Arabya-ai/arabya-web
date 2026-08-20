import { auth } from "@/auth";
import { humanizeAiError, runAiAuto } from "@/lib/lughawi/ai-gateway";
import { countArabicWords } from "@/lib/lughawi/config";
import { resolveLughawiAiCandidates } from "@/lib/lughawi/resolve-ai";
import { getQuota, tryChargeQuota } from "@/lib/lughawi/quota-store";
import { enforceRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

const LANGS: Record<string, string> = {
  en: "English",
  fr: "French",
  de: "German",
  es: "Spanish",
  tr: "Turkish",
};

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { prefix: "lughawi-translate", limit: 20 });
  if (limited) return limited;

  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email || session?.error === "Banned") {
    return NextResponse.json({ error: "يلزم تسجيل الدخول", code: "auth" }, { status: 401 });
  }

  let body: { text?: string; targetLang?: string; provider?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const target = LANGS[body.targetLang ?? "en"] ? (body.targetLang ?? "en") : "en";
  if (!text) return NextResponse.json({ error: "أدخل نصًا" }, { status: 400 });

  const { candidates, chargeProject } = resolveLughawiAiCandidates({
    userId: email,
    mode: body.provider ?? "auto",
  });
  if (!candidates.length) {
    return NextResponse.json(
      {
        error:
          "لا مفتاح متاح. الصق مفتاحك في إعدادات لغوي أو أضف مفاتيح المشروع من لوحة المدير.",
        code: "no_key",
      },
      { status: 402 },
    );
  }
  const words = countArabicWords(text);
  if (chargeProject && getQuota(email).remainingWords < words) {
    return NextResponse.json(
      {
        error:
          "انتهت الكلمات المجانية. الصق مفتاحك الخاص في إعدادات لغوي للمتابعة.",
        code: "quota_exhausted",
        quota: getQuota(email),
      },
      { status: 402 },
    );
  }

  try {
    const { text: out, provider, attempts } = await runAiAuto({
      candidates,
      system: `Translate Arabic to ${LANGS[target]}. Return only the translation.`,
      user: text,
    });
    if (chargeProject) tryChargeQuota(email, words);
    return NextResponse.json({
      original: text,
      result: out,
      edits: [],
      protectedSpans: [],
      meta: {
        engine: "lughawi-translate-auto",
        usedAi: true,
        quotaCharged: chargeProject ? words : 0,
        provider,
        warning: attempts && attempts > 1 ? `Auto حاول ${attempts} مزودين` : undefined,
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: humanizeAiError(
          e instanceof Error ? e.message : "translate failed",
        ),
      },
      { status: 502 },
    );
  }
}
