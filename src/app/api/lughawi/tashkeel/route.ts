import { auth } from "@/auth";
import { resolveProjectAi, runAiChat } from "@/lib/lughawi/ai-gateway";
import { getUserApiKey } from "@/lib/lughawi/credentials-store";
import { applyLocalTashkeel } from "@/lib/lughawi/engines/tashkeel-engine";
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
    return NextResponse.json(
      {
        ...({
          original: text,
          result: local.result,
          edits: [],
          protectedSpans: [],
          meta: {
            engine: "lughawi-tashkeel-local",
            usedAi: false,
            quotaCharged: 0,
            warning: "سجّل الدخول واستخدم الحصة أو مفتاحك لتشكيل أوسع.",
          },
        } satisfies ProofreadResponse),
      },
    );
  }

  const userKey = getUserApiKey(email, body.provider);
  const project = resolveProjectAi();
  let apiKey: string | undefined;
  let provider: string | undefined;
  let charge = false;
  if (userKey) {
    apiKey = userKey.apiKey;
    provider = userKey.provider;
  } else if (project) {
    if (getQuota(email).remainingChars < text.length) {
      return NextResponse.json({ error: "quota", code: "quota_exhausted" }, { status: 402 });
    }
    apiKey = project.apiKey;
    provider = project.provider;
    charge = true;
  } else {
    return NextResponse.json({
      original: text,
      result: local.result,
      edits: [],
      protectedSpans: [],
      meta: {
        engine: "lughawi-tashkeel-local",
        usedAi: false,
        quotaCharged: 0,
        warning: "لا مفتاح AI — أُرجع التشكيل المحلي.",
      },
    } satisfies ProofreadResponse);
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
    const { text: out } = await runAiChat({
      provider: provider!,
      apiKey: apiKey!,
      system: "أضف التشكيل للنص العربي حسب المطلوب. أعد النص المشكّل فقط.",
      user: `${levelHint}:\n${text}`,
    });
    if (charge) tryChargeQuota(email, text.length);
    return NextResponse.json({
      original: text,
      result: out || local.result,
      edits: [],
      protectedSpans: [],
      meta: {
        engine: "lughawi-tashkeel-ai",
        usedAi: true,
        quotaCharged: charge ? text.length : 0,
        provider,
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
        warning: e instanceof Error ? e.message : "AI tashkeel failed",
      },
    } satisfies ProofreadResponse);
  }
}
