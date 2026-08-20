/**
 * Lughawi Engine Core — staged proofread pipeline modeled after
 * production NLP/AI inference stacks (normalize → guard → stages → merge → rank).
 */

import {
  findProtectedQuranSpans,
  isInsideProtected,
} from "@/lib/lughawi/quran-guard";
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

export const LUGHAWI_ENGINE_VERSION = "1.1.0";

export type EngineStageId =
  | "guard"
  | "spelling"
  | "grammar"
  | "style"
  | "punctuation"
  | "merge"
  | "rank";

export interface EngineStage {
  id: EngineStageId;
  labelAr: string;
  labelEn: string;
  /** Ordered stages that emit edits (guard is meta-only). */
  run?: (text: string, locale: "ar" | "en") => LughawiEdit[];
}

/** Registry — same idea as model pipeline stages in AI engines. */
export const ENGINE_STAGES: EngineStage[] = [
  {
    id: "guard",
    labelAr: "حماية النص القرآني",
    labelEn: "Quran guard",
  },
  {
    id: "grammar",
    labelAr: "نحو واتفاق",
    labelEn: "Grammar & agreement",
    run: collectGrammarEdits,
  },
  {
    id: "spelling",
    labelAr: "إملاء ومعجم",
    labelEn: "Spelling & lexicon",
    run: collectSpellingEdits,
  },
  {
    id: "style",
    labelAr: "أسلوب وتنسيق",
    labelEn: "Style & spacing",
    run: collectStyleEdits,
  },
  {
    id: "punctuation",
    labelAr: "ترقيم",
    labelEn: "Punctuation",
    run: collectPunctuationEdits,
  },
  {
    id: "merge",
    labelAr: "دمج التعارضات",
    labelEn: "Conflict merge",
  },
  {
    id: "rank",
    labelAr: "ترتيب الثقة",
    labelEn: "Confidence rank",
  },
];

function filterProtected(
  edits: LughawiEdit[],
  spans: ProtectedSpan[],
): LughawiEdit[] {
  return edits.filter((e) => !isInsideProtected(e.start, e.end, spans));
}

/** Drop low-confidence noise; keep educational value above floor. */
export function rankEdits(
  edits: LughawiEdit[],
  minConfidence = 0.5,
): LughawiEdit[] {
  return [...edits]
    .filter((e) => e.confidence >= minConfidence)
    .map((e) => ({
      ...e,
      confidence: Math.round(e.confidence * 1000) / 1000,
    }))
    .sort(
      (a, b) =>
        b.confidence - a.confidence || a.start - b.start || b.end - a.end,
    )
    .sort((a, b) => a.start - b.start || b.end - a.end);
}

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

  for (const stage of ENGINE_STAGES) {
    if (!stage.run) continue;
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
  const merged = mergeEdits(stageEdits);
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
    },
  };
}
