import {
  findProtectedQuranSpans,
  isInsideProtected,
} from "@/lib/lughawi/quran-guard";
import { collectGrammarEdits } from "@/lib/lughawi/rules/grammar";
import { collectPunctuationEdits } from "@/lib/lughawi/rules/punctuation";
import { collectSpellingEdits } from "@/lib/lughawi/rules/spelling";
import type {
  LughawiEdit,
  ProofreadOptions,
  ProofreadResponse,
  ProtectedSpan,
} from "@/lib/lughawi/types";

function overlaps(a: LughawiEdit, b: LughawiEdit): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Merge stage edits with non-overlapping spans; earlier stages win. */
export function mergeEdits(stages: LughawiEdit[][]): LughawiEdit[] {
  const accepted: LughawiEdit[] = [];
  for (const stage of stages) {
    for (const edit of stage) {
      if (accepted.some((e) => overlaps(e, edit))) continue;
      accepted.push(edit);
    }
  }
  return accepted.sort((a, b) => a.start - b.start || b.end - a.end);
}

export function applyEdits(text: string, edits: LughawiEdit[]): string {
  const sorted = [...edits]
    .filter((e) => e.status !== "rejected")
    .sort((a, b) => b.start - a.start);
  let out = text;
  for (const e of sorted) {
    out = out.slice(0, e.start) + e.suggestion + out.slice(e.end);
  }
  return out;
}

function filterProtected(
  edits: LughawiEdit[],
  spans: ProtectedSpan[],
): LughawiEdit[] {
  return edits.filter((e) => !isInsideProtected(e.start, e.end, spans));
}

/** Local hybrid proofread — free, no AI. */
export function proofreadLocal(
  text: string,
  options: ProofreadOptions = {},
): ProofreadResponse {
  const locale = options.locale ?? "ar";
  const original = text;
  const protectedSpans = findProtectedQuranSpans(original);

  const spelling = filterProtected(collectSpellingEdits(original, locale), protectedSpans);
  const grammar = filterProtected(collectGrammarEdits(original, locale), protectedSpans);
  const punct = filterProtected(collectPunctuationEdits(original, locale), protectedSpans);

  const edits = mergeEdits([spelling, grammar, punct]);
  const result = applyEdits(original, edits);

  return {
    original,
    result,
    edits,
    protectedSpans,
    meta: {
      engine: "lughawi-local",
      usedAi: false,
      quotaCharged: 0,
    },
  };
}
