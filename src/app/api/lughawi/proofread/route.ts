import { auth } from "@/auth";
import {
  buildAutoCandidates,
  humanizeAiError,
} from "@/lib/lughawi/ai-gateway";
import { enrichProofreadWithAi } from "@/lib/lughawi/ai-proofread";
import { enrichProofreadWithArabyaNlp } from "@/lib/lughawi/arabya-nlp-enrich";
import { enrichProofreadWithSidecar } from "@/lib/lughawi/sidecar-enrich";
import { lughawiMaxGuestChars, countArabicWords } from "@/lib/lughawi/config";
import { applyEdits, mergeEdits } from "@/lib/lughawi/pipeline-merge";
import { proofreadLocal } from "@/lib/lughawi/pipeline";
import { resolveLughawiAiCandidates } from "@/lib/lughawi/resolve-ai";
import { getQuota, tryChargeQuota } from "@/lib/lughawi/quota-store";
import { sessionSkipsLughawiRateLimit } from "@/lib/lughawi/rate-limit-policy";
import type { ProofMode, ProofreadResponse } from "@/lib/lughawi/types";
import { enforceRateLimit, LUGHAWI_PROOFREAD_LIMIT } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

/**
 * Contabo hybrid: Alnnahwi (sidecar) ∥ Ollama (arabya-nlp) in parallel.
 * Wall-clock ≈ max(sidecar, nlp), not the sum.
 */
export const maxDuration = 120;

function stageNote(result: ProofreadResponse, id: string): string {
  const s = result.meta.stages?.find((x) => x.id === id);
  return typeof s?.note === "string" ? s.note : "";
}

function contaboOllamaAlreadyUsed(result: ProofreadResponse): boolean {
  const nlp = stageNote(result, "arabya-nlp");
  return /ollama/i.test(nlp) && !/llm-skipped|unreachable|skip/i.test(nlp);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!sessionSkipsLughawiRateLimit(session)) {
    const limited = enforceRateLimit(req, {
      prefix: "lughawi-proofread",
      limit: LUGHAWI_PROOFREAD_LIMIT,
    });
    if (limited) return limited;
  }

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

  // Layer 1: offline TypeScript rules (instant Contabo foundation)
  const local = proofreadLocal(text, {
    locale,
    mode: "proofread",
    proofMode,
  });

  // Contabo RAM: local Ollama 8B + neural GEC thrash swap and time out the UI.
  // Opt-in only via env. Rules (TS + arabya-nlp PyArabic) stay always-on and fast.
  const allowLocalOllama = process.env.LUGHAWI_LOCAL_OLLAMA === "1";
  const allowNeuralGec = process.env.LUGHAWI_NEURAL_GEC === "1";
  const runLocalLlm = Boolean(wantAi && allowLocalOllama);
  const runNeural = Boolean(wantAi && allowNeuralGec);

  // Layers 2 + 2b in PARALLEL (light by default):
  //   :8091 sidecar — rules (+ Alnnahwi only if LUGHAWI_NEURAL_GEC=1)
  //   :8092 arabya-nlp — PyArabic/rules (+ Ollama only if LUGHAWI_LOCAL_OLLAMA=1)
  const [fromSidecar, fromNlp] = await Promise.all([
    enrichProofreadWithSidecar(local, {
      neural: runNeural,
      timeoutMs: runNeural ? 45_000 : 4_000,
    }).catch(() => local),
    enrichProofreadWithArabyaNlp(local, {
      skipLlm: !runLocalLlm,
      timeoutMs: runLocalLlm ? 25_000 : 8_000,
    }).catch(() => local),
  ]);

  const sidecarStage = (fromSidecar.meta.stages ?? []).find(
    (s) => s.id === "sidecar-nlp",
  );
  const nlpStage = (fromNlp.meta.stages ?? []).find((s) => s.id === "arabya-nlp");
  const baseStages = (local.meta.stages ?? []).filter(
    (s) => s.id !== "sidecar-nlp" && s.id !== "arabya-nlp",
  );

  const mergedEdits = mergeEdits([local.edits, fromSidecar.edits, fromNlp.edits]);
  let result: ProofreadResponse = {
    original: text,
    result: applyEdits(text, mergedEdits),
    edits: mergedEdits,
    protectedSpans: local.protectedSpans,
    meta: {
      engine: local.meta.engine,
      usedAi: Boolean(fromSidecar.meta.usedAi || fromNlp.meta.usedAi),
      offline: Boolean(fromSidecar.meta.offline && fromNlp.meta.offline),
      quotaCharged: 0,
      provider: fromNlp.meta.provider ?? fromSidecar.meta.provider,
      warning: fromNlp.meta.warning ?? fromSidecar.meta.warning,
      stages: [
        ...baseStages,
        ...(sidecarStage ? [sidecarStage] : []),
        ...(nlpStage ? [nlpStage] : []),
        {
          id: "parallel-contabo",
          editCount: mergedEdits.length,
          ms: Math.max(sidecarStage?.ms ?? 0, nlpStage?.ms ?? 0),
          note: wantAi
            ? "sidecar(Alnnahwi∥rules) ∥ arabya-nlp(rules∥Ollama)"
            : "sidecar(rules) ∥ arabya-nlp(rules-only)",
        },
      ],
    },
  };

  if (!wantAi) {
    return NextResponse.json(result);
  }

  const email = session?.user?.email?.trim().toLowerCase();
  const banned = session?.error === "Banned";

  // Guests: Contabo parallel stack only — never burn project/admin cloud keys.
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

  // Avoid double Ollama when Contabo arabya-nlp already ran llama.
  if (contaboOllamaAlreadyUsed(result)) {
    candidates = candidates.filter((c) => c.provider !== "ollama");
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

  // Layer 3 (signed-in only): optional cloud Gemini/OpenAI polish after Contabo.
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
