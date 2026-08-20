import { explainRule } from "@/lib/lughawi/rules/notes";
import type { LughawiEdit } from "@/lib/lughawi/types";

let seq = 0;

/**
 * Lightweight MSA grammar heuristics (not a full parser).
 * Later stages can plug CAMeL GEC without changing the Edit contract.
 */
export function collectGrammarEdits(
  text: string,
  locale: "ar" | "en" = "ar",
): LughawiEdit[] {
  const edits: LughawiEdit[] = [];

  // Common: إن الطالبُ → إن الطالبَ (simplified: «إن ال» + known nominative mistake with damma)
  const innaWrong = /إن\s+ال([\u0600-\u06FF]+?)ُ/g;
  let m: RegExpExecArray | null;
  while ((m = innaWrong.exec(text)) !== null) {
    const full = m[0]!;
    const start = m.index;
    const end = start + full.length;
    const suggestion = full.replace(/ُ$/, "َ");
    seq += 1;
    edits.push({
      id: `gr-${seq}`,
      start,
      end,
      type: "grammar",
      original: full,
      suggestion,
      ruleId: "inna-nasb",
      explanation: explainRule("inna-nasb", locale),
      confidence: 0.7,
      source: "rules",
      status: "proposed",
    });
  }

  // «هذه الكتاب» → «هذا الكتاب»
  const demMasc = /هذه\s+(الكتاب|القلم|الرجل|الولد|اليوم|الأمر)/g;
  while ((m = demMasc.exec(text)) !== null) {
    const start = m.index;
    const end = start + 3; // هذه
    seq += 1;
    edits.push({
      id: `gr-${seq}`,
      start,
      end,
      type: "grammar",
      original: "هذه",
      suggestion: "هذا",
      ruleId: "agreement-demo",
      explanation: explainRule("agreement-demo", locale),
      confidence: 0.82,
      source: "rules",
      status: "proposed",
    });
  }

  // «هذا المدرسة» → «هذه المدرسة»
  const demFem = /هذا\s+(المدرسة|السيارة|المرأة|البنت|الفكرة|اللغة)/g;
  while ((m = demFem.exec(text)) !== null) {
    const start = m.index;
    const end = start + 3;
    seq += 1;
    edits.push({
      id: `gr-${seq}`,
      start,
      end,
      type: "grammar",
      original: "هذا",
      suggestion: "هذه",
      ruleId: "agreement-demo",
      explanation: explainRule("agreement-demo", locale),
      confidence: 0.82,
      source: "rules",
      status: "proposed",
    });
  }

  return edits.sort((a, b) => a.start - b.start);
}
