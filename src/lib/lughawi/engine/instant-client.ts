/**
 * Browser-safe instant proofread — no node:fs, no learning-store, no dont-correct file.
 */

import { rankEdits } from "@/lib/lughawi/engine/rank-edits";
import { LUGHAWI_ENGINE_VERSION } from "@/lib/lughawi/engine/stages-meta";
import { mergeEdits } from "@/lib/lughawi/pipeline-merge";
import {
  findProtectedQuranSpans,
  isInsideProtected,
} from "@/lib/lughawi/quran-guard";
import { collectGrammarEdits } from "@/lib/lughawi/rules/grammar";
import { collectPunctuationEdits } from "@/lib/lughawi/rules/punctuation";
import { collectSpellingEditsOffline } from "@/lib/lughawi/rules/spelling-offline";
import { collectStyleEdits } from "@/lib/lughawi/rules/style";
import type { LughawiEdit, ProofreadOptions } from "@/lib/lughawi/types";

function filterProtected(
  edits: LughawiEdit[],
  spans: ReturnType<typeof findProtectedQuranSpans>,
): LughawiEdit[] {
  return edits.filter((e) => !isInsideProtected(e.start, e.end, spans));
}

/** Client-only engine pass for live typing hints. */
export function runInstantProofreadEngine(
  text: string,
  options: Pick<ProofreadOptions, "locale" | "proofMode" | "minConfidence"> = {},
): LughawiEdit[] {
  const locale = options.locale ?? "ar";
  const protectedSpans = findProtectedQuranSpans(text);
  const spellingOnly = options.proofMode === "spelling";
  const stageEdits: LughawiEdit[][] = [];

  const spelling = filterProtected(collectSpellingEditsOffline(text, locale), protectedSpans);
  stageEdits.push(spelling);

  if (!spellingOnly) {
    stageEdits.push(filterProtected(collectGrammarEdits(text, locale), protectedSpans));
    stageEdits.push(filterProtected(collectStyleEdits(text, locale), protectedSpans));
  }

  stageEdits.push(filterProtected(collectPunctuationEdits(text, locale), protectedSpans));

  const merged = mergeEdits(stageEdits);
  return rankEdits(merged, options.minConfidence ?? 0.5);
}

export { LUGHAWI_ENGINE_VERSION };
