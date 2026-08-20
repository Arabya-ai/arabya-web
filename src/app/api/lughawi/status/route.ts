import { LUGHAWI_ENGINE_VERSION, ENGINE_STAGES } from "@/lib/lughawi/engine/core";
import { learningStats } from "@/lib/lughawi/learning-store";
import { resolveProjectAiPool } from "@/lib/lughawi/ai-gateway";
import { NextResponse } from "next/server";

export async function GET() {
  let poolCount = 0;
  try {
    poolCount = resolveProjectAiPool().length;
  } catch {
    poolCount = 0;
  }

  return NextResponse.json({
    offline: true,
    engine: {
      version: LUGHAWI_ENGINE_VERSION,
      stages: ENGINE_STAGES.map((s) => ({
        id: s.id,
        labelAr: s.labelAr,
        labelEn: s.labelEn,
      })),
    },
    learning: learningStats(),
    projectPoolCount: poolCount,
    note: "Core proofread runs offline via staged engine. AI rewrite/translate need keys.",
  });
}
