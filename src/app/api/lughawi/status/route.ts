import {
  arabyaNlpBaseUrl,
  arabyaNlpProofreadEnabled,
  probeArabyaNlpHealth,
} from "@/lib/lughawi/arabya-nlp-client";
import {
  ENGINE_STAGE_META,
  LUGHAWI_ENGINE_VERSION,
} from "@/lib/lughawi/engine/stages-meta";
import { learningStats } from "@/lib/lughawi/learning-store";
import { lughawiProjectAiPoolSummary } from "@/lib/lughawi/config";
import { probeSidecarHealth } from "@/lib/lughawi/sidecar-client";
import { NextResponse } from "next/server";

export async function GET() {
  let summary = {
    total: 0,
    byProvider: {} as Record<string, number>,
    hasLocal: false,
  };
  try {
    summary = lughawiProjectAiPoolSummary();
  } catch {
    /* ignore */
  }

  const [nlp, sidecar] = await Promise.all([
    probeArabyaNlpHealth(1200),
    probeSidecarHealth(800),
  ]);

  return NextResponse.json({
    offline: true,
    engine: {
      version: LUGHAWI_ENGINE_VERSION,
      stages: ENGINE_STAGE_META.map((s) => ({
        id: s.id,
        labelAr: s.labelAr,
        labelEn: s.labelEn,
      })),
    },
    learning: learningStats(),
    projectPoolCount: summary.total,
    projectPoolByProvider: summary.byProvider,
    projectPoolHasLocal: summary.hasLocal,
    arabyaNlp: {
      enabled: arabyaNlpProofreadEnabled(),
      url: arabyaNlpBaseUrl(),
      proofreadPath: "/v1/proofread",
      tashkeelPath: "/v1/tashkeel",
      conjugatePath: "/v1/conjugate",
      enginesPath: "/v1/engines",
      publicProxy: "/api/lughawi/proofread",
      health: nlp,
      priorityAr:
        "أوفلاين: PyArabic + قواعد (+ تشكيل محلي/mishkal). أونلاين: نفس الشيء + Ollama بالتوازي.",
    },
    sidecar: {
      health: sidecar,
    },
    note: "UI calls /api/lughawi/proofread only. Next.js proxies Contabo arabya-nlp at ARABYA_NLP_URL (default http://127.0.0.1:8092). Port 8092 stays private.",
  });
}
