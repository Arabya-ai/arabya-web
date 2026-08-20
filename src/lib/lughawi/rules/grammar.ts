import { explainRule } from "@/lib/lughawi/rules/notes";
import type { LughawiEdit } from "@/lib/lughawi/types";

let seq = 0;

function add(
  edits: LughawiEdit[],
  start: number,
  end: number,
  original: string,
  suggestion: string,
  ruleId: string,
  locale: "ar" | "en",
  confidence: number,
): void {
  if (original === suggestion) return;
  seq += 1;
  edits.push({
    id: `gr-${seq}`,
    start,
    end,
    type: "grammar",
    original,
    suggestion,
    ruleId,
    explanation: explainRule(ruleId, locale),
    confidence,
    source: "rules",
    status: "proposed",
  });
}

/**
 * MSA grammar heuristics (not a full parser).
 * Designed as a pluggable engine stage — CAMeL GEC can replace/augment later
 * without changing the Edit contract.
 */
export function collectGrammarEdits(
  text: string,
  locale: "ar" | "en" = "ar",
): LughawiEdit[] {
  const edits: LughawiEdit[] = [];
  let m: RegExpExecArray | null;

  // إنّ + damma on noun → fatha (when diacritics present)
  const innaWrong = /إن\s+ال([\u0600-\u06FF]+?)ُ/g;
  while ((m = innaWrong.exec(text)) !== null) {
    const full = m[0]!;
    add(
      edits,
      m.index,
      m.index + full.length,
      full,
      full.replace(/ُ$/, "َ"),
      "inna-nasb",
      locale,
      0.7,
    );
  }

  // Demonstrative agreement (masculine nouns)
  const demMasc =
    /هذه\s+(الكتاب|القلم|الرجل|الولد|اليوم|الأمر|البيت|الباب|الدرس|الموضوع|المشروع|البرنامج|الموقع|النص|الخطأ)/g;
  while ((m = demMasc.exec(text)) !== null) {
    add(edits, m.index, m.index + 3, "هذه", "هذا", "agreement-demo", locale, 0.84);
  }

  // Demonstrative agreement (feminine nouns)
  const demFem =
    /هذا\s+(المدرسة|السيارة|المرأة|البنت|الفكرة|اللغة|المسألة|المشكلة|الصفحة|الرسالة|الخدمة|الكلمة|الجملة|الفقرة)/g;
  while ((m = demFem.exec(text)) !== null) {
    add(edits, m.index, m.index + 3, "هذا", "هذه", "agreement-demo", locale, 0.84);
  }

  // يجب ان / يمكن ان / ينبغي ان / لا بد ان → أن
  const anPatterns: { re: RegExp; from: string; to: string }[] = [
    { re: /يجب\s+ان(?=[\s\u0600-\u06FF])/g, from: "ان", to: "أن" },
    { re: /يمكن\s+ان(?=[\s\u0600-\u06FF])/g, from: "ان", to: "أن" },
    { re: /ينبغي\s+ان(?=[\s\u0600-\u06FF])/g, from: "ان", to: "أن" },
    { re: /لا\s+بد\s+ان(?=[\s\u0600-\u06FF])/g, from: "ان", to: "أن" },
    { re: /قبل\s+ان(?=[\s\u0600-\u06FF])/g, from: "ان", to: "أن" },
    { re: /بعد\s+ان(?=[\s\u0600-\u06FF])/g, from: "ان", to: "أن" },
    { re: /دون\s+ان(?=[\s\u0600-\u06FF])/g, from: "ان", to: "أن" },
    { re: /رغم\s+ان(?=[\s\u0600-\u06FF])/g, from: "ان", to: "أن" },
    { re: /على\s+ان(?=[\s\u0600-\u06FF])/g, from: "ان", to: "أن" },
    { re: /بمجرد\s+ان(?=[\s\u0600-\u06FF])/g, from: "ان", to: "أن" },
  ];

  for (const { re, from, to } of anPatterns) {
    while ((m = re.exec(text)) !== null) {
      const full = m[0]!;
      const idx = full.lastIndexOf(from);
      if (idx < 0) continue;
      const start = m.index + idx;
      const end = start + from.length;
      add(edits, start, end, from, to, "an-masdar", locale, 0.88);
    }
  }

  // لم + imperfect plural ending ون → وا (jussive approximation)
  const lamPlural = /لم\s+([\u0600-\u06FF]{2,12})ون(?=[\s.,،؛؟!]|$)/g;
  while ((m = lamPlural.exec(text)) !== null) {
    const verb = m[1]!;
    const start = m.index + 3; // after «لم »
    const end = start + verb.length + 2; // ون
    add(
      edits,
      start,
      end,
      `${verb}ون`,
      `${verb}وا`,
      "lam-jussive",
      locale,
      0.72,
    );
  }

  // لن + ون ending similarly
  const lanPlural = /لن\s+([\u0600-\u06FF]{2,12})ون(?=[\s.,،؛؟!]|$)/g;
  while ((m = lanPlural.exec(text)) !== null) {
    const verb = m[1]!;
    const start = m.index + 3;
    const end = start + verb.length + 2;
    add(
      edits,
      start,
      end,
      `${verb}ون`,
      `${verb}وا`,
      "lan-nasb",
      locale,
      0.7,
    );
  }

  // كانو → كانوا (common typo; alef-farq also catches but word-level is clearer)
  const kanu = /(?<![\u0600-\u06FFa-zA-Z0-9])كانو(?!ا)(?![\u0600-\u06FFa-zA-Z0-9])/g;
  while ((m = kanu.exec(text)) !== null) {
    add(edits, m.index, m.index + 4, "كانو", "كانوا", "alef-farq", locale, 0.9);
  }

  // قالو → قالوا
  const qalu = /(?<![\u0600-\u06FFa-zA-Z0-9])قالو(?!ا)(?![\u0600-\u06FFa-zA-Z0-9])/g;
  while ((m = qalu.exec(text)) !== null) {
    add(edits, m.index, m.index + 4, "قالو", "قالوا", "alef-farq", locale, 0.9);
  }

  // هو الذي تفعل → هو الذي يفعل (very light gender on relative + verb) — skip, too risky

  // عدد + feminine noun wrong: ثلاثة كتب → ثلاثة كتب OK; ثلاث كتاب → ثلاثة كتب hard

  return edits.sort((a, b) => a.start - b.start);
}
