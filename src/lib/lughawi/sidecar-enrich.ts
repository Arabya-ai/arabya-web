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

export type SidecarEnrichOpts = {
  /** Run Alnnahwi / AraBART neural GEC after rules (CPU-heavy on Contabo). */
  neural?: boolean;
  /** Override timeout (ms). Defaults: neural 45000 / rules-only 4000. */
  timeoutMs?: number;
};

export async function enrichProofreadWithSidecar(
  local: ProofreadResponse,
  opts?: SidecarEnrichOpts,
): Promise<ProofreadResponse> {
  const wantNeural = Boolean(opts?.neural);
  const timeoutMs =
    opts?.timeoutMs ??
    (wantNeural ? 45_000 : local.edits.length > 0 ? 2_000 : 4_000);
  const t0 = Date.now();
  const payload = await sidecarGec(local.original, timeoutMs, {
    neural: wantNeural,
  });
  const ms = Date.now() - t0;

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
            ms,
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
    const isNeural =
      typeof raw.ruleId === "string" &&
      (raw.ruleId.includes("alnnahwi") || raw.ruleId.includes("arabart") || raw.ruleId.includes("gec"));
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
          : isNeural
            ? "تصحيح من محرك النحوي (لغوي)"
            : "تصحيح من محرك لغوي المحلي",
      confidence:
        typeof raw.confidence === "number" ? raw.confidence : isNeural ? 0.72 : 0.85,
      source: isNeural || wantNeural ? "gec" : "gec",
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
            ms,
            note: `sidecar:${payload.engine}`,
          },
        ],
      },
    };
  }

  const merged = mergeEdits([local.edits, mapped]);
  const result = applyEdits(local.original, merged);
  const usedNeural =
    wantNeural &&
    (payload.engine.includes("alnnahwi") ||
      payload.engine.includes("arabart") ||
      mapped.some((e) => (e.ruleId || "").includes("alnnahwi")));

  return {
    ...local,
    result,
    edits: merged,
    meta: {
      ...local.meta,
      offline: local.meta.offline && !usedNeural,
      usedAi: local.meta.usedAi || usedNeural,
      stages: [
        ...(local.meta.stages ?? []),
        {
          id: "sidecar-nlp",
          editCount: mapped.length,
          ms,
          note: `sidecar:${payload.engine}${wantNeural ? ":neural" : ":rules"}`,
        },
      ],
    },
  };
}
