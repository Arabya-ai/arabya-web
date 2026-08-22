import type { LughawiEdit } from "@/lib/lughawi/types";

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
