import { explainRule } from "@/lib/lughawi/rules/notes";
import type { LughawiEdit } from "@/lib/lughawi/types";

let seq = 0;

function push(
  edits: LughawiEdit[],
  text: string,
  start: number,
  end: number,
  suggestion: string,
  ruleId: string,
  locale: "ar" | "en",
  confidence: number,
  type: LughawiEdit["type"] = "style",
): void {
  if (text.slice(start, end) === suggestion) return;
  seq += 1;
  edits.push({
    id: `st-${seq}`,
    start,
    end,
    type,
    original: text.slice(start, end),
    suggestion,
    ruleId,
    explanation: explainRule(ruleId, locale),
    confidence,
    source: "rules",
    status: "proposed",
  });
}

/**
 * Style / formatting heuristics — spacing, Arabic punctuation norms,
 * common connective polish (not full rewrite).
 */
export function collectStyleEdits(
  text: string,
  locale: "ar" | "en" = "ar",
): LughawiEdit[] {
  const edits: LughawiEdit[] = [];

  // Triple+ newlines → double
  const nlRe = /\n{3,}/g;
  let m: RegExpExecArray | null;
  while ((m = nlRe.exec(text)) !== null) {
    push(edits, text, m.index, m.index + m[0]!.length, "\n\n", "double-space", locale, 0.9);
  }

  // Latin comma between Arabic letters → Arabic comma
  const commaRe = /([\u0600-\u06FF])\s*,\s*([\u0600-\u06FF])/g;
  while ((m = commaRe.exec(text)) !== null) {
    const start = m.index + m[1]!.length;
    const end = m.index + m[0]!.length - m[2]!.length;
    push(edits, text, start, end, "،", "ar-comma", locale, 0.88, "punctuation");
  }

  // Latin ? after Arabic → Arabic ؟
  const qRe = /([\u0600-\u06FF])\s*\?/g;
  while ((m = qRe.exec(text)) !== null) {
    const start = m.index + m[1]!.length;
    const end = m.index + m[0]!.length;
    push(edits, text, start, end, "؟", "ar-question", locale, 0.9, "punctuation");
  }

  // Latin ; after Arabic → Arabic ؛
  const scRe = /([\u0600-\u06FF])\s*;/g;
  while ((m = scRe.exec(text)) !== null) {
    const start = m.index + m[1]!.length;
    const end = m.index + m[0]!.length;
    push(edits, text, start, end, "؛", "ar-semicolon", locale, 0.88, "punctuation");
  }

  // أكثر من ما → أكثر مما
  const moreRe = /أكثر\s+من\s+ما/g;
  while ((m = moreRe.exec(text)) !== null) {
    push(edits, text, m.index, m.index + m[0]!.length, "أكثر مما", "style-connective", locale, 0.86);
  }

  // على كل حال → على كلِّ حال (skip diacritic) — just normalize spacing variants
  const anywayRe = /على\s{2,}كل\s+حال/g;
  while ((m = anywayRe.exec(text)) !== null) {
    push(edits, text, m.index, m.index + m[0]!.length, "على كل حال", "double-space", locale, 0.92);
  }

  // هناك يوجد → يوجد (common redundancy) — lower confidence
  const redundant = /هناك\s+يوجد/g;
  while ((m = redundant.exec(text)) !== null) {
    push(edits, text, m.index, m.index + m[0]!.length, "يوجد", "style-redundant", locale, 0.62);
  }

  return edits.sort((a, b) => a.start - b.start);
}
