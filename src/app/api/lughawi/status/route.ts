import {
  ENGINE_STAGE_META,
  LUGHAWI_ENGINE_VERSION,
} from "@/lib/lughawi/engine/stages-meta";
import { learningStats } from "@/lib/lughawi/learning-store";
import { lughawiProjectAiPoolSummary } from "@/lib/lughawi/config";
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
    note: "Core proofread runs offline. AI Auto uses user keys then multi-key project pool then local Ollama.",
  });
}
