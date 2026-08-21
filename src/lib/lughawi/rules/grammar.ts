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

  // إنّ وأخواتها + جمع مذكر سالم مرفوع (…ون) → منصوب/مجرور (…ين) بدون حاجة للضبط
  // مثال: إن المعلمون → إن المعلمين
  const innaSoundMasc =
    /(?:^|[\s،,.])(إن|أن|كأن|لكن|ليت|لعل)\s+(ال[\u0621-\u064A]{2,24})ون(?=[\s.,،؛؟!]|$)/g;
  while ((m = innaSoundMasc.exec(text)) !== null) {
    const noun = `${m[2]!}ون`;
    const start = m.index + m[0]!.lastIndexOf(noun);
    add(
      edits,
      start,
      start + noun.length,
      noun,
      `${m[2]!}ين`,
      "inna-nasb",
      locale,
      0.9,
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
      "lam-jussive",
      locale,
      0.7,
    );
  }

  // Object of «قرأ / يقرأ / تقرأ / نقرأ / أقرأ»: كتاب → كتابًا (accusative tanween)
  const qaraKitab =
    /(?:^|[\s،,])((?:أ|ا)?قرأ|يقرأ|تقرأ|نقرأ|تقرا|يقرا|نقرا|اقرا)\s+(كتاب)(?=[\s.,،؛؟!]|$)/g;
  while ((m = qaraKitab.exec(text)) !== null) {
    const noun = m[2]!;
    const start = m.index + m[0]!.lastIndexOf(noun);
    add(edits, start, start + noun.length, noun, "كتابًا", "accusative-object", locale, 0.86);
  }

  // قابَلَ على → علي (name) when followed by typical name context is in spelling;
  // number agreement heuristics below.

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

  // Number–noun gender (high-precision closed lists)
  // ثلاث كتاب → ثلاثة كتب / ثلاث كتب OK for feminine counted nouns in 3–10
  const numFemWrong =
    /(?<![\u0600-\u06FFa-zA-Z0-9])(ثلاث|أربع|خمس|ست|سبع|ثمان|تسع|عشر)\s+(كتاب|قلم|رجل|ولد|يوم|درس|مشروع|برنامج|موقع|نص|خطأ|تقرير)(?![\u0600-\u06FFa-zA-Z0-9])/g;
  const femToMasc: Record<string, string> = {
    ثلاث: "ثلاثة",
    أربع: "أربعة",
    خمس: "خمسة",
    ست: "ستة",
    سبع: "سبعة",
    ثمان: "ثمانية",
    تسع: "تسعة",
    عشر: "عشرة",
  };
  while ((m = numFemWrong.exec(text)) !== null) {
    const num = m[1]!;
    const to = femToMasc[num];
    if (!to) continue;
    add(edits, m.index, m.index + num.length, num, to, "num-agreement", locale, 0.78);
  }

  const numMascWrong =
    /(?<![\u0600-\u06FFa-zA-Z0-9])(ثلاثة|أربعة|خمسة|ستة|سبعة|ثمانية|تسعة|عشرة)\s+(مدرسة|سيارة|مرأة|بنت|فكرة|لغة|مسألة|مشكلة|صفحة|رسالة|خدمة|كلمة|جملة|فقرة)(?![\u0600-\u06FFa-zA-Z0-9])/g;
  const mascToFem: Record<string, string> = {
    ثلاثة: "ثلاث",
    أربعة: "أربع",
    خمسة: "خمس",
    ستة: "ست",
    سبعة: "سبع",
    ثمانية: "ثمان",
    تسعة: "تسع",
    عشرة: "عشر",
  };
  while ((m = numMascWrong.exec(text)) !== null) {
    const num = m[1]!;
    const to = mascToFem[num];
    if (!to) continue;
    add(edits, m.index, m.index + num.length, num, to, "num-agreement", locale, 0.78);
  }

  // هناك يوجد → هناك (redundant)
  const hunak = /هناك\s+يوجد/g;
  while ((m = hunak.exec(text)) !== null) {
    add(edits, m.index, m.index + m[0]!.length, m[0]!, "هناك", "style-redundant", locale, 0.7);
  }

  return edits.sort((a, b) => a.start - b.start);
}
