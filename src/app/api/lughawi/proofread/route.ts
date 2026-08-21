import { auth } from "@/auth";
import {
  buildAutoCandidates,
  humanizeAiError,
} from "@/lib/lughawi/ai-gateway";
import { enrichProofreadWithAi } from "@/lib/lughawi/ai-proofread";
import { enrichProofreadWithArabyaNlp } from "@/lib/lughawi/arabya-nlp-enrich";
import { enrichProofreadWithSidecar } from "@/lib/lughawi/sidecar-enrich";
import { lughawiMaxGuestChars, countArabicWords } from "@/lib/lughawi/config";
import { proofreadLocal } from "@/lib/lughawi/pipeline";
import { resolveLughawiAiCandidates } from "@/lib/lughawi/resolve-ai";
import { getQuota, tryChargeQuota } from "@/lib/lughawi/quota-store";
import type { ProofMode } from "@/lib/lughawi/types";
import { enforceRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

/** Contabo / LiteSpeed may drop very long proxied POSTs; keep under a minute. */
export const maxDuration = 60;

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

  // Layer 2: Contabo sidecar rule-NLP (fast path; neural GEC only if explicitly requested later).
  // Keep timeout short so interactive UI never hangs on Alnnahwi/Stanza CPU load.
  try {
    result = await enrichProofreadWithSidecar(result);
  } catch {
    // Sidecar is optional — keep local rules.
  }

  // Layer 2b: Contabo arabya-nlp FastAPI (:8092) — server-side only proxy.
  // Browser → /api/lughawi/proofread → http://127.0.0.1:8092/v1/proofread
  // Do NOT expose :8092 on public Nginx/OLS; Next is the public front door.
  // Keep ARABYA_NLP_URL=http://127.0.0.1:8092 (never https://arabya.org — that loops).
  // Cap Ollama wait: long hangs were dropped by the edge proxy → UI errorGeneric.
  try {
    const allowInteractiveLlm =
      process.env.ARABYA_NLP_INTERACTIVE_LLM?.trim() === "1";
    result = await enrichProofreadWithArabyaNlp(result, {
      // Default: FastAPI rules only (snappy). Set ARABYA_NLP_INTERACTIVE_LLM=1
      // to also wait on Contabo Ollama when useAi is true.
      skipLlm: allowInteractiveLlm ? !wantAi : true,
      timeoutMs: allowInteractiveLlm && wantAi ? 12_000 : 8_000,
    });
  } catch {
    // arabya-nlp optional — keep local + sidecar.
  }

  if (!wantAi) {
    return NextResponse.json(result);
  }

  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  const banned = session?.error === "Banned";

  // Guests: local rules + sidecar only — never burn project/admin AI keys without a session.
  let candidates: ReturnType<typeof buildAutoCandidates> = [];
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
