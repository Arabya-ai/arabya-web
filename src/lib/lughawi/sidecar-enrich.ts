/**
 * Merge sidecar rule-NLP / GEC edits into a local proofread result.
 * Never throws — on failure returns the input unchanged.
 */

import { mergeEdits, applyEdits } from "@/lib/lughawi/pipeline-merge";
import { sidecarGec } from "@/lib/lughawi/sidecar-client";
import type { LughawiEdit, ProofreadResponse } from "@/lib/lughawi/types";

function overlapsProtected(
  start: number,
  end: number,
  spans: ProofreadResponse["protectedSpans"],
): boolean {
  return spans.some((s) => start < s.end && end > s.start);
}

export async function enrichProofreadWithSidecar(
  local: ProofreadResponse,
): Promise<ProofreadResponse> {
  const payload = await sidecarGec(local.original);
  if (!payload || !payload.edits.length) {
    return {
      ...local,
      meta: {
        ...local.meta,
        stages: [
          ...(local.meta.stages ?? []),
          {
            id: "sidecar-nlp",
            editCount: 0,
            ms: 0,
            note: payload?.engine
              ? `sidecar:${payload.engine} (no new edits)`
              : "sidecar unreachable — rules-only",
          },
        ],
      },
    };
  }

  const mapped: LughawiEdit[] = [];
  let seq = 0;
  for (const raw of payload.edits) {
    const start = typeof raw.start === "number" ? raw.start : -1;
    const end = typeof raw.end === "number" ? raw.end : -1;
    const original =
      typeof raw.original === "string" ? raw.original : "";
    const suggestion =
      typeof raw.suggestion === "string" ? raw.suggestion : "";
    if (start < 0 || end <= start || !original || !suggestion) continue;
    if (original === suggestion) continue;
    if (overlapsProtected(start, end, local.protectedSpans)) continue;
    // Must match the original text slice (stale offsets discarded).
    if (local.original.slice(start, end) !== original) continue;
    seq += 1;
    const type = (
      ["spelling", "grammar", "morphology", "punctuation", "style", "tashkeel", "other"] as const
    ).includes(raw.type as LughawiEdit["type"])
      ? (raw.type as LughawiEdit["type"])
      : "other";
    mapped.push({
      id: `sidecar-${seq}`,
      start,
      end,
      type,
      original,
      suggestion,
      ruleId: typeof raw.ruleId === "string" ? raw.ruleId : undefined,
      explanation:
        typeof raw.explanation === "string" && raw.explanation
          ? raw.explanation
          : "تصحيح من محرك NLP المحلي (Stanza/قواعد)",
      confidence:
        typeof raw.confidence === "number" ? raw.confidence : 0.8,
      source: "gec",
      status: "proposed",
    });
  }

  if (!mapped.length) {
    return {
      ...local,
      meta: {
        ...local.meta,
        stages: [
          ...(local.meta.stages ?? []),
          {
            id: "sidecar-nlp",
            editCount: 0,
            ms: 0,
            note: `sidecar:${payload.engine}`,
          },
        ],
      },
    };
  }

  const merged = mergeEdits([local.edits, mapped]);
  const result = applyEdits(local.original, merged);
  return {
    ...local,
    result,
    edits: merged,
    meta: {
      ...local.meta,
      offline: local.meta.offline && !payload.engine.includes("arabart"),
      stages: [
        ...(local.meta.stages ?? []),
        {
          id: "sidecar-nlp",
          editCount: mapped.length,
          ms: 0,
          note: `sidecar:${payload.engine}`,
        },
      ],
    },
  };
}
