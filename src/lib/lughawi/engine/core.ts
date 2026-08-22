/**
 * Lughawi Engine Core — staged proofread pipeline modeled after
 * production NLP/AI inference stacks (normalize → guard → stages → merge → rank).
 *
 * Server-only: spelling stage touches learning-store (node:fs).
 * Client UI must import labels from `./stages-meta` only.
 */

import { rankEdits } from "@/lib/lughawi/engine/rank-edits";
import { filterDontCorrect } from "@/lib/lughawi/dont-correct";
import { scoreEloquence } from "@/lib/lughawi/eloquence";
import {
  findProtectedQuranSpans,
  isInsideProtected,
} from "@/lib/lughawi/quran-guard";
import {
  ENGINE_STAGE_META,
  LUGHAWI_ENGINE_VERSION,
  type EngineStageId,
  type EngineStageMeta,
} from "@/lib/lughawi/engine/stages-meta";
import { applyEdits, mergeEdits } from "@/lib/lughawi/pipeline-merge";
import { collectGrammarEdits } from "@/lib/lughawi/rules/grammar";
import { collectPunctuationEdits } from "@/lib/lughawi/rules/punctuation";
import { collectSpellingEdits } from "@/lib/lughawi/rules/spelling";
import { collectStyleEdits } from "@/lib/lughawi/rules/style";
import type {
  EngineStageTrace,
  LughawiEdit,
  ProofreadOptions,
  ProofreadResponse,
  ProtectedSpan,
} from "@/lib/lughawi/types";

export { LUGHAWI_ENGINE_VERSION, type EngineStageId };
export type { EngineStageMeta };

export interface EngineStage extends EngineStageMeta {
  /** Ordered stages that emit edits (guard is meta-only). */
  run?: (text: string, locale: "ar" | "en") => LughawiEdit[];
}

const STAGE_RUNNERS: Partial<
  Record<EngineStageId, (text: string, locale: "ar" | "en") => LughawiEdit[]>
> = {
  grammar: collectGrammarEdits,
  spelling: collectSpellingEdits,
  style: collectStyleEdits,
  punctuation: collectPunctuationEdits,
};

/** Registry — same idea as model pipeline stages in AI engines. */
export const ENGINE_STAGES: EngineStage[] = ENGINE_STAGE_META.map((meta) => ({
  ...meta,
  run: STAGE_RUNNERS[meta.id],
}));

function filterProtected(
  edits: LughawiEdit[],
  spans: ProtectedSpan[],
): LughawiEdit[] {
  return edits.filter((e) => !isInsideProtected(e.start, e.end, spans));
}

export { rankEdits } from "@/lib/lughawi/engine/rank-edits";

/**
 * Full offline engine pass — deterministic, free, no network.
 * Returns edits + stage telemetry (like an inference trace).
 */
export function runProofreadEngine(
  text: string,
  options: ProofreadOptions = {},
): ProofreadResponse {
  const locale = options.locale ?? "ar";
  const original = text;
  const traces: EngineStageTrace[] = [];
  const t0 = Date.now();

  const guardStart = Date.now();
  const protectedSpans = findProtectedQuranSpans(original);
  traces.push({
    id: "guard",
    editCount: 0,
    ms: Date.now() - guardStart,
    note: `${protectedSpans.length} protected span(s)`,
  });

  const stageEdits: LughawiEdit[][] = [];
  const spellingOnly = options.proofMode === "spelling";

  for (const stage of ENGINE_STAGES) {
    if (!stage.run) continue;
    if (spellingOnly && (stage.id === "grammar" || stage.id === "style")) {
      traces.push({
        id: stage.id,
        editCount: 0,
        ms: 0,
        note: "skipped (spelling-only)",
      });
      continue;
    }
    const start = Date.now();
    const raw = stage.run(original, locale);
    const filtered = filterProtected(raw, protectedSpans);
    stageEdits.push(filtered);
    traces.push({
      id: stage.id,
      editCount: filtered.length,
      ms: Date.now() - start,
    });
  }

  const mergeStart = Date.now();
  const merged = filterDontCorrect(mergeEdits(stageEdits));
  traces.push({
    id: "merge",
    editCount: merged.length,
    ms: Date.now() - mergeStart,
  });

  const rankStart = Date.now();
  const edits = rankEdits(merged, options.minConfidence ?? 0.5);
  traces.push({
    id: "rank",
    editCount: edits.length,
    ms: Date.now() - rankStart,
  });

  const result = applyEdits(original, edits);
  const eloquence = scoreEloquence(original, edits.length);

  return {
    original,
    result,
    edits,
    protectedSpans,
    meta: {
      engine: `lughawi-engine@${LUGHAWI_ENGINE_VERSION}`,
      usedAi: false,
      quotaCharged: 0,
      offline: true,
      version: LUGHAWI_ENGINE_VERSION,
      stages: traces,
      totalMs: Date.now() - t0,
      eloquence: {
        score: eloquence.score,
        summaryAr: eloquence.summaryAr,
      },
    },
  };
}
