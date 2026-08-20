import { auth } from "@/auth";
import {
  buildAutoCandidates,
  humanizeAiError,
} from "@/lib/lughawi/ai-gateway";
import { enrichProofreadWithAi } from "@/lib/lughawi/ai-proofread";
import { enrichProofreadWithSidecar } from "@/lib/lughawi/sidecar-enrich";
import { lughawiMaxGuestChars, countArabicWords } from "@/lib/lughawi/config";
import { proofreadLocal } from "@/lib/lughawi/pipeline";
import { resolveLughawiAiCandidates } from "@/lib/lughawi/resolve-ai";
import { getQuota, tryChargeQuota } from "@/lib/lughawi/quota-store";
import type { ProofMode } from "@/lib/lughawi/types";
import { enforceRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { prefix: "lughawi-proofread", limit: 40 });
  if (limited) return limited;

  let body: {
    text?: string;
    locale?: string;
    mode?: string;
    proofMode?: string;
    useAi?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text : "";
  const locale = body.locale === "en" ? "en" : "ar";
  const proofMode: ProofMode =
    body.proofMode === "spelling" ? "spelling" : "full";
  const wantAi = body.useAi !== false;
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

  // Layer 1: offline TypeScript rules
  let result = proofreadLocal(text, {
    locale,
    mode: "proofread",
    proofMode,
  });

  // Layer 2: Contabo sidecar rule-NLP (Stanza/PyArabic/CAMeL) + optional neural GEC
  try {
    result = await enrichProofreadWithSidecar(result);
  } catch {
    // Sidecar is optional — keep local rules.
  }

  if (!wantAi) {
    return NextResponse.json(result);
  }

  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  const banned = session?.error === "Banned";

  let candidates = buildAutoCandidates({ userCandidates: [] });
  let chargeProject = false;

  if (email && !banned) {
    const resolved = resolveLughawiAiCandidates({
      userId: email,
      mode: "auto",
    });
    candidates = resolved.candidates;
    chargeProject = resolved.chargeProject;
  }

  if (!candidates.length) {
    return NextResponse.json(result);
  }

  const words = countArabicWords(text);
  if (chargeProject && email) {
    const quota = getQuota(email);
    if (quota.remainingWords < words) {
      return NextResponse.json({
        ...result,
        meta: {
          ...result.meta,
          warning:
            "انتهت الكلمات المجانية على مفاتيح المشروع — عُرض التدقيق المحلي. الصق مفتاحك في الإعدادات أو انتظر الشهر القادم.",
        },
      });
    }
  }

  // Layer 3: cloud / local LLM enrichment (Gemini Auto pool, Ollama Llama-3.1-8B, …)
  try {
    result = await enrichProofreadWithAi(result, candidates);
    if (chargeProject && email && result.meta.usedAi) {
      tryChargeQuota(email, words);
      result = {
        ...result,
        meta: {
          ...result.meta,
          quotaCharged: words,
        },
      };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI failed";
    result = {
      ...result,
      meta: {
        ...result.meta,
        warning: humanizeAiError(msg),
      },
    };
  }

  return NextResponse.json(result);
}
