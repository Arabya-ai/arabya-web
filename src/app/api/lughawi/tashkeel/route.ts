import { auth } from "@/auth";
import { runAiAuto } from "@/lib/lughawi/ai-gateway";
import { countArabicWords } from "@/lib/lughawi/config";
import { applyLocalTashkeel } from "@/lib/lughawi/engines/tashkeel-engine";
import { resolveLughawiAiCandidates } from "@/lib/lughawi/resolve-ai";
import { getQuota, tryChargeQuota } from "@/lib/lughawi/quota-store";
import type { ProofreadResponse, TashkeelLevel } from "@/lib/lughawi/types";
import { enforceRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

const LEVELS: TashkeelLevel[] = ["full", "partial", "endings", "mandatory"];

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { prefix: "lughawi-tashkeel", limit: 30 });
  if (limited) return limited;

  let body: {
    text?: string;
    level?: TashkeelLevel;
    useAi?: boolean;
    provider?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text : "";
  const level = LEVELS.includes(body.level as TashkeelLevel)
    ? (body.level as TashkeelLevel)
    : "full";
  if (!text.trim()) {
    return NextResponse.json({ error: "أدخل نصًا" }, { status: 400 });
  }

  const local = applyLocalTashkeel(text, level);
  const coverage = local.total ? local.covered / local.total : 0;

  if (!body.useAi || coverage >= 0.85) {
    const payload: ProofreadResponse = {
      original: text,
      result: local.result,
      edits: [],
      protectedSpans: [],
      meta: {
        engine: "lughawi-tashkeel-local",
        usedAi: false,
        quotaCharged: 0,
        offline: true,
        warning:
          coverage < 0.5
            ? "تشكيل محلي جزئي — فعّل الذكاء الاصطناعي لتغطية أوسع."
            : undefined,
      },
    };
    return NextResponse.json(payload);
  }

  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({
      original: text,
      result: local.result,
      edits: [],
      protectedSpans: [],
      meta: {
        engine: "lughawi-tashkeel-local",
        usedAi: false,
        quotaCharged: 0,
        offline: true,
        warning: "سجّل الدخول واستخدم الحصة أو مفتاحك لتشكيل أوسع.",
      },
    } satisfies ProofreadResponse);
  }

  const { candidates, chargeProject } = resolveLughawiAiCandidates({
    userId: email,
    mode: body.provider ?? "auto",
  });

  if (!candidates.length) {
    return NextResponse.json({
      original: text,
      result: local.result,
      edits: [],
      protectedSpans: [],
      meta: {
        engine: "lughawi-tashkeel-local",
        usedAi: false,
        quotaCharged: 0,
        offline: true,
        warning: "لا مفتاح AI — أُرجع التشكيل المحلي.",
      },
    } satisfies ProofreadResponse);
  }

  if (chargeProject && getQuota(email).remainingWords < countArabicWords(text)) {
    return NextResponse.json(
      {
        error:
          "انتهت الكلمات المجانية. الصق مفتاحك الخاص في إعدادات لغوي للمتابعة.",
        code: "quota_exhausted",
      },
      { status: 402 },
    );
  }

  try {
    const levelHint =
      level === "full"
        ? "تشكيل كامل"
        : level === "partial"
          ? "تشكيل جزئي (شدة وتنوين أساسًا)"
          : level === "endings"
            ? "تشكيل أواخر الكلمات فقط"
            : "تشكيل إلزامي أساسي";
    const words = countArabicWords(text);
    const { text: out, provider, attempts } = await runAiAuto({
      candidates,
      system: "أضف التشكيل للنص العربي حسب المطلوب. أعد النص المشكّل فقط.",
      user: `${levelHint}:\n${text}`,
    });
    if (chargeProject) tryChargeQuota(email, words);
    return NextResponse.json({
      original: text,
      result: out || local.result,
      edits: [],
      protectedSpans: [],
      meta: {
        engine: "lughawi-tashkeel-auto",
        usedAi: true,
        quotaCharged: chargeProject ? words : 0,
        provider,
        warning: attempts && attempts > 1 ? `Auto حاول ${attempts} مزودين` : undefined,
      },
    } satisfies ProofreadResponse);
  } catch (e) {
    return NextResponse.json({
      original: text,
      result: local.result,
      edits: [],
      protectedSpans: [],
      meta: {
        engine: "lughawi-tashkeel-local",
        usedAi: false,
        quotaCharged: 0,
        offline: true,
        warning: e instanceof Error ? e.message : "AI tashkeel failed",
      },
    } satisfies ProofreadResponse);
  }
}
