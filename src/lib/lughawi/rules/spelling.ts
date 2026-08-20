import { explainRule } from "@/lib/lughawi/rules/notes";
import type { LughawiEdit } from "@/lib/lughawi/types";

function nextId(prefix: string, n: number): string {
  return `${prefix}-${n}`;
}

type Locale = "ar" | "en";

function wordEdit(
  text: string,
  start: number,
  end: number,
  suggestion: string,
  ruleId: string,
  locale: Locale,
  id: string,
  confidence = 0.9,
): LughawiEdit {
  return {
    id,
    start,
    end,
    type: "spelling",
    original: text.slice(start, end),
    suggestion,
    ruleId,
    explanation: explainRule(ruleId, locale),
    confidence,
    source: "rules",
    status: "proposed",
  };
}

/** Whole-word replacements (MSA spelling). */
const WORD_MAP: { from: RegExp; to: string; ruleId: string; confidence?: number }[] = [
  { from: /(?<![^\s\u0600-\u06FF])انا(?![^\s\u0600-\u06FF])/g, to: "أنا", ruleId: "hamza-ana" },
  { from: /(?<![^\s\u0600-\u06FF])الى(?![^\s\u0600-\u06FF])/g, to: "إلى", ruleId: "ila-preposition" },
  { from: /(?<![^\s\u0600-\u06FF])علي(?![^\s\u0600-\u06FF])/g, to: "على", ruleId: "ila-preposition", confidence: 0.55 },
  { from: /(?<![^\s\u0600-\u06FF])هذة(?![^\s\u0600-\u06FF])/g, to: "هذه", ruleId: "ta-marbuta" },
  { from: /(?<![^\s\u0600-\u06FF])هاذا(?![^\s\u0600-\u06FF])/g, to: "هذا", ruleId: "hamza-ana", confidence: 0.85 },
  { from: /(?<![^\s\u0600-\u06FF])لاكن(?![^\s\u0600-\u06FF])/g, to: "لكن", ruleId: "hamza-ana", confidence: 0.88 },
  { from: /(?<![^\s\u0600-\u06FF])الان(?![^\s\u0600-\u06FF])/g, to: "الآن", ruleId: "hamza-ana" },
  { from: /(?<![^\s\u0600-\u06FF])انتم(?![^\s\u0600-\u06FF])/g, to: "أنتم", ruleId: "hamza-ana" },
  { from: /(?<![^\s\u0600-\u06FF])انت(?![^\s\u0600-\u06FF])/g, to: "أنت", ruleId: "hamza-ana" },
  { from: /(?<![^\s\u0600-\u06FF])انتي(?![^\s\u0600-\u06FF])/g, to: "أنتِ", ruleId: "hamza-ana", confidence: 0.8 },
  { from: /(?<![^\s\u0600-\u06FF])اولا(?![^\s\u0600-\u06FF])/g, to: "أولًا", ruleId: "hamza-ana", confidence: 0.75 },
  { from: /(?<![^\s\u0600-\u06FF])المدرسه(?![^\s\u0600-\u06FF])/g, to: "المدرسة", ruleId: "ta-marbuta" },
  { from: /(?<![^\s\u0600-\u06FF])جامعه(?![^\s\u0600-\u06FF])/g, to: "جامعة", ruleId: "ta-marbuta" },
  { from: /(?<![^\s\u0600-\u06FF])لغه(?![^\s\u0600-\u06FF])/g, to: "لغة", ruleId: "ta-marbuta" },
  { from: /(?<![^\s\u0600-\u06FF])كلمه(?![^\s\u0600-\u06FF])/g, to: "كلمة", ruleId: "ta-marbuta" },
  { from: /(?<![^\s\u0600-\u06FF])فكره(?![^\s\u0600-\u06FF])/g, to: "فكرة", ruleId: "ta-marbuta" },
  { from: /(?<![^\s\u0600-\u06FF])مسأله(?![^\s\u0600-\u06FF])/g, to: "مسألة", ruleId: "ta-marbuta" },
];

/** Alf farq heuristic: واو الجماعة without trailing ا before space/punct. */
const ALEF_FARQ =
  /(?<![^\s\u0600-\u06FF])([بتثجحخدذرزسشصضطظعغفقكلمنوي][^\s]{1,12}و)(?=[\s.,،؛؟!)]|$)/g;

export function collectSpellingEdits(
  text: string,
  locale: Locale = "ar",
): LughawiEdit[] {
  const edits: LughawiEdit[] = [];
  let seq = 0;

  for (const rule of WORD_MAP) {
    rule.from.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.from.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0]!.length;
      if (m[0] === rule.to) continue;
      seq += 1;
      edits.push(
        wordEdit(
          text,
          start,
          end,
          rule.to,
          rule.ruleId,
          locale,
          nextId("sp", seq),
          rule.confidence,
        ),
      );
    }
  }

  ALEF_FARQ.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ALEF_FARQ.exec(text)) !== null) {
    const stem = m[1]!;
    // Skip if already has alef farq or looks like noun ending و
    if (stem.endsWith("وا") || stem.length < 3) continue;
    const start = m.index;
    const end = start + stem.length;
    seq += 1;
    edits.push(
      wordEdit(
        text,
        start,
        end,
        `${stem}ا`,
        "alef-farq",
        locale,
        nextId("sp", seq),
        0.62,
      ),
    );
  }

  // Double spaces
  const spaceRe = / {2,}/g;
  let sm: RegExpExecArray | null;
  while ((sm = spaceRe.exec(text)) !== null) {
    seq += 1;
    edits.push(
      wordEdit(
        text,
        sm.index,
        sm.index + sm[0]!.length,
        " ",
        "double-space",
        locale,
        nextId("sp", seq),
        0.95,
      ),
    );
  }

  return edits.sort((a, b) => a.start - b.start || b.end - a.end);
}
