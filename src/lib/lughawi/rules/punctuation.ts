import { explainRule } from "@/lib/lughawi/rules/notes";
import type { LughawiEdit } from "@/lib/lughawi/types";

let seq = 0;

/** Fix spaces before Arabic/Latin punctuation + missing space after. */
export function collectPunctuationEdits(
  text: string,
  locale: "ar" | "en" = "ar",
): LughawiEdit[] {
  const edits: LughawiEdit[] = [];
  let m: RegExpExecArray | null;

  const before = / +([،؛؟!.:])/g;
  while ((m = before.exec(text)) !== null) {
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

  // Missing space after Arabic punctuation when followed by a letter
  const after = /([،؛؟!])([\u0600-\u06FFa-zA-Z0-9])/g;
  while ((m = after.exec(text)) !== null) {
    const start = m.index;
    const end = start + m[0]!.length;
    seq += 1;
    edits.push({
      id: `pu-${seq}`,
      start,
      end,
      type: "punctuation",
      original: m[0]!,
      suggestion: `${m[1]} ${m[2]}`,
      ruleId: "punct-after",
      explanation: explainRule("punct-after", locale),
      confidence: 0.93,
      source: "punctuation",
      status: "proposed",
    });
  }

  return edits;
}
