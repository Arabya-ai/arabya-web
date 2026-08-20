import { auth } from "@/auth";
import { resolveProjectAi, runAiChat } from "@/lib/lughawi/ai-gateway";
import { getUserApiKey } from "@/lib/lughawi/credentials-store";
import { getQuota, tryChargeQuota } from "@/lib/lughawi/quota-store";
import type { ProofreadResponse, RewriteStyle } from "@/lib/lughawi/types";
import { enforceRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

const STYLE_PROMPT: Record<RewriteStyle, string> = {
  fusha: "أعد صياغة النص بالعربية الفصحى الرصينة مع الحفاظ على المعنى.",
  clearer: "أعد صياغة النص ليكون أوضح وأسلس بالعربية الفصحى.",
  shorter: "اختصر النص بالعربية الفصحى دون فقدان المعنى الجوهري.",
};

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { prefix: "lughawi-rewrite", limit: 20 });
  if (limited) return limited;

  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email || session?.error === "Banned") {
    return NextResponse.json({ error: "يلزم تسجيل الدخول", code: "auth" }, { status: 401 });
  }

  let body: { text?: string; style?: RewriteStyle; provider?: string; locale?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const style: RewriteStyle =
    body.style === "clearer" || body.style === "shorter" ? body.style : "fusha";
  const locale = body.locale === "en" ? "en" : "ar";
  if (!text) {
    return NextResponse.json({ error: "أدخل نصًا" }, { status: 400 });
  }

  const userKey = getUserApiKey(email, body.provider);
  const project = resolveProjectAi();
  let apiKey: string | undefined;
  let provider: string | undefined;
  let chargeProject = false;

  if (userKey) {
    apiKey = userKey.apiKey;
    provider = userKey.provider;
  } else if (project) {
    const quota = getQuota(email);
    if (quota.remainingChars < text.length) {
      return NextResponse.json(
        {
          error: "نفدت الحصة الشهرية المجانية. أضف مفتاح API الخاص بك.",
          code: "quota_exhausted",
          quota,
        },
        { status: 402 },
      );
    }
    apiKey = project.apiKey;
    provider = project.provider;
    chargeProject = true;
  } else {
    return NextResponse.json(
      {
        error:
          "لا مفتاح متاح. أضف مفتاحك في إعدادات لغوي أو اضبط مفتاح مشروع مدقق العربية على الخادم.",
        code: "no_key",
      },
      { status: 402 },
    );
  }

  try {
    const { text: out } = await runAiChat({
      provider: provider!,
      apiKey: apiKey!,
      system:
        "أنت مدقق لغوي عربي فصيح محترف. أعد النص المطلوب فقط دون شرح أو علامات اقتباس.",
      user: `${STYLE_PROMPT[style]}\n\nالنص:\n${text}`,
    });
    if (chargeProject && !tryChargeQuota(email, text.length)) {
      return NextResponse.json({ error: "quota", code: "quota_exhausted" }, { status: 402 });
    }
    const payload: ProofreadResponse = {
      original: text,
      result: out || text,
      edits: [
        {
          id: "rw-1",
          start: 0,
          end: text.length,
          type: "style",
          original: text,
          suggestion: out || text,
          explanation:
            locale === "en"
              ? "AI reformulation"
              : "إعادة صياغة بالذكاء الاصطناعي مع الحفاظ على المعنى.",
          confidence: 0.75,
          source: "ai",
          status: "proposed",
        },
      ],
      protectedSpans: [],
      meta: {
        engine: "lughawi-ai",
        usedAi: true,
        quotaCharged: chargeProject ? text.length : 0,
        provider,
      },
    };
    return NextResponse.json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
