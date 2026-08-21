/**
 * Merge Contabo arabya-nlp (:8092) proofread into the Lughawi UI response shape.
 * Never throws — on failure returns the input unchanged.
 */

import {
  arabyaNlpProofread,
  arabyaNlpProofreadEnabled,
  type ArabyaNlpEdit,
} from "@/lib/lughawi/arabya-nlp-client";
import { applyEdits, mergeEdits } from "@/lib/lughawi/pipeline-merge";
import type { LughawiEdit, ProofreadResponse } from "@/lib/lughawi/types";

function overlapsProtected(
  start: number,
  end: number,
  spans: ProofreadResponse["protectedSpans"],
): boolean {
  return spans.some((s) => start < s.end && end > s.start);
}

function mapType(raw: string | undefined): LughawiEdit["type"] {
  const allowed = [
    "spelling",
    "grammar",
    "morphology",
    "punctuation",
    "style",
    "tashkeel",
    "other",
  ] as const;
  return (allowed as readonly string[]).includes(raw ?? "")
    ? (raw as LughawiEdit["type"])
    : "other";
}

function mapSource(stage: string | undefined): LughawiEdit["source"] {
  if (stage === "llm" || stage === "ollama") return "ai";
  if (stage === "gec") return "gec";
  return "rules";
}

export async function enrichProofreadWithArabyaNlp(
  local: ProofreadResponse,
  opts?: { skipLlm?: boolean; timeoutMs?: number },
): Promise<ProofreadResponse> {
  if (!arabyaNlpProofreadEnabled()) {
    return {
      ...local,
      meta: {
        ...local.meta,
        stages: [
          ...(local.meta.stages ?? []),
          {
            id: "arabya-nlp",
            editCount: 0,
            ms: 0,
            note: "disabled (ARABYA_NLP_PROOFREAD=0)",
          },
        ],
      },
    };
  }

  const t0 = Date.now();
  const payload = await arabyaNlpProofread(local.original, {
    skipLlm: opts?.skipLlm,
    timeoutMs: opts?.timeoutMs,
  });
  const ms = Date.now() - t0;

  if (!payload) {
    return {
      ...local,
      meta: {
        ...local.meta,
        stages: [
          ...(local.meta.stages ?? []),
          {
            id: "arabya-nlp",
            editCount: 0,
            ms,
            note: "lughawi engine unreachable — kept local/sidecar",
          },
        ],
      },
    };
  }

  const mapped: LughawiEdit[] = [];
  let seq = 0;
  const claimed = new Set<string>();

  function claimSpan(
    start: number,
    end: number,
    originalTok: string,
    suggestion: string,
    raw: ArabyaNlpEdit,
  ): void {
    const key = `${start}:${end}`;
    if (claimed.has(key)) return;
    if (end <= start || !originalTok || !suggestion) return;
    if (originalTok === suggestion) return;
    if (local.original.slice(start, end) !== originalTok) return;
    if (overlapsProtected(start, end, local.protectedSpans)) return;
    claimed.add(key);
    seq += 1;
    mapped.push({
      id: typeof raw.id === "string" && raw.id ? raw.id : `nlp-${seq}`,
      start,
      end,
      type: mapType(raw.type),
      original: originalTok,
      suggestion,
      ruleId: typeof raw.rule_id === "string" ? raw.rule_id : undefined,
      explanation:
        typeof raw.explanation === "string" && raw.explanation
          ? raw.explanation
          : "تصحيح من محرك لغوي",
      confidence: raw.stage === "llm" ? 0.75 : 0.9,
      source: mapSource(raw.stage),
      status: "proposed",
    });
  }

  for (const raw of payload.edits) {
    const originalTok = typeof raw.original === "string" ? raw.original : "";
    const suggestion =
      typeof raw.suggestion === "string" ? raw.suggestion : "";
    if (!originalTok || !suggestion || originalTok === suggestion) continue;

    const start = typeof raw.start === "number" ? raw.start : -1;
    const end = typeof raw.end === "number" ? raw.end : -1;
    if (start >= 0 && end > start && local.original.slice(start, end) === originalTok) {
      claimSpan(start, end, originalTok, suggestion, raw);
      continue;
    }

    // Fallback: locate token in the user original (Ollama historically sent 0:0).
    let from = 0;
    while (from < local.original.length) {
      const idx = local.original.indexOf(originalTok, from);
      if (idx < 0) break;
      const endIdx = idx + originalTok.length;
      const before = idx === 0 ? "" : local.original[idx - 1]!;
      const after =
        endIdx >= local.original.length ? "" : local.original[endIdx]!;
      const isLetter = (c: string) => /[\u0600-\u06FFa-zA-Z0-9]/.test(c);
      from = endIdx;
      if (isLetter(before) || isLetter(after)) continue;
      claimSpan(idx, endIdx, originalTok, suggestion, raw);
      break;
    }
  }

  // If FastAPI returned a corrected string but no span edits, expose a full-doc edit.
  if (
    !mapped.length &&
    payload.corrected &&
    payload.corrected !== local.original &&
    payload.corrected !== local.result
  ) {
    mapped.push({
      id: "nlp-full",
      start: 0,
      end: local.original.length,
      type: "grammar",
      original: local.original,
      suggestion: payload.corrected,
      ruleId: "arabya-nlp-full",
      explanation: "نص مصحّح عبر لغوي (قواعد + نموذج محلي)",
      confidence: 0.8,
      source: payload.stage2_engine?.includes("ollama") ? "ai" : "rules",
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
            id: "arabya-nlp",
            editCount: 0,
            ms,
            note: `lughawi:${payload.stage1_engine ?? "ok"}+${payload.stage2_engine ?? "ok"} (no new edits)`,
          },
        ],
      },
    };
  }

  const merged = mergeEdits([local.edits, mapped]);
  const result = applyEdits(local.original, merged);
  const usedLlm = Boolean(
    payload.stage2_engine &&
      payload.stage2_engine !== "llm-skipped" &&
      !payload.stage2_engine.includes("skip"),
  );

  return {
    ...local,
    result,
    edits: merged,
    meta: {
      ...local.meta,
      offline: local.meta.offline && !usedLlm,
      usedAi: local.meta.usedAi || usedLlm,
      provider: usedLlm ? "lughawi" : local.meta.provider,
      stages: [
        ...(local.meta.stages ?? []),
        {
          id: "arabya-nlp",
          editCount: mapped.length,
          ms,
          note: `lughawi:${payload.stage1_engine ?? "?"}+${payload.stage2_engine ?? "?"}${payload.parallel ? ":parallel" : ""}${payload.mode ? `:${payload.mode}` : ""}`,
        },
      ],
    },
  };
}
