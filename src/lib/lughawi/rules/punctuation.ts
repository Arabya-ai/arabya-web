import { explainRule } from "@/lib/lughawi/rules/notes";
import type { LughawiEdit } from "@/lib/lughawi/types";

let seq = 0;

/** Fix spaces before Arabic/Latin punctuation. */
export function collectPunctuationEdits(
  text: string,
  locale: "ar" | "en" = "ar",
): LughawiEdit[] {
  const edits: LughawiEdit[] = [];
  const re = / +([،؛؟!.:])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const start = m.index;
    const end = start + m[0]!.length;
    seq += 1;
    edits.push({
      id: `pu-${seq}`,
      start,
      end,
      type: "punctuation",
      original: m[0]!,
      suggestion: m[1]!,
      ruleId: "punct-space",
      explanation: explainRule("punct-space", locale),
      confidence: 0.97,
      source: "punctuation",
      status: "proposed",
    });
  }
  return edits;
}
