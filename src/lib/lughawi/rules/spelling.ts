import { explainRule } from "@/lib/lughawi/rules/notes";
import {
  getActiveLearnedPairs,
  isPairSuppressed,
} from "@/lib/lughawi/learning-store";
import type { LughawiEdit } from "@/lib/lughawi/types";

function nextId(prefix: string, n: number): string {
  return `${prefix}-${n}`;
}

type Locale = "ar" | "en";

/** Word boundary: not Arabic/Latin/digit on either side. */
function wordRe(word: string): RegExp {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\u0600-\\u06FFa-zA-Z0-9])${esc}(?![\\u0600-\\u06FFa-zA-Z0-9])`, "g");
}

function wordEdit(
  text: string,
  start: number,
  end: number,
  suggestion: string,
  ruleId: string,
  locale: Locale,
  id: string,
  confidence = 0.9,
  source: LughawiEdit["source"] = "rules",
): LughawiEdit {
  return {
    id,
    start,
    end,
    type: "spelling",
    original: text.slice(start, end),
    suggestion,
    ruleId,
    explanation:
      ruleId === "learned"
        ? locale === "en"
          ? "Learned from user accept/reject feedback."
          : "تصحيح مستفاد من قبول/رفض المستخدمين."
        : explainRule(ruleId, locale),
    confidence,
    source,
    status: "proposed",
  };
}

/** Built-in MSA spelling pairs (offline). */
export const BUILTIN_SPELLING: { from: string; to: string; ruleId: string; confidence?: number }[] = [
  { from: "انا", to: "أنا", ruleId: "hamza-ana" },
  { from: "انت", to: "أنت", ruleId: "hamza-ana" },
  { from: "انتي", to: "أنتِ", ruleId: "hamza-ana", confidence: 0.8 },
  { from: "انتم", to: "أنتم", ruleId: "hamza-ana" },
  { from: "انتن", to: "أنتن", ruleId: "hamza-ana" },
  { from: "نحن", to: "نحن", ruleId: "hamza-ana", confidence: 0 }, // noop marker skipped
  { from: "الى", to: "إلى", ruleId: "ila-preposition" },
  // NEVER blind-map علي→على (اسم عَلِيّ). Context rule handles على→علي below.
  { from: "فى", to: "في", ruleId: "ya-preposition" },
  { from: "احمد", to: "أحمد", ruleId: "name-hamza" },
  { from: "ابراهيم", to: "إبراهيم", ruleId: "name-hamza" },
  { from: "اسماعيل", to: "إسماعيل", ruleId: "name-hamza" },
  { from: "اسحاق", to: "إسحاق", ruleId: "name-hamza", confidence: 0.85 },
  { from: "ايوب", to: "أيوب", ruleId: "name-hamza", confidence: 0.85 },
  { from: "الياس", to: "إلياس", ruleId: "name-hamza", confidence: 0.8 },
  { from: "امين", to: "أمين", ruleId: "name-hamza", confidence: 0.8 },
  { from: "ايمن", to: "أيمن", ruleId: "name-hamza", confidence: 0.85 },
  { from: "امل", to: "أمل", ruleId: "name-hamza", confidence: 0.75 },
  { from: "اسامة", to: "أسامة", ruleId: "name-hamza", confidence: 0.85 },
  { from: "انس", to: "أنس", ruleId: "name-hamza", confidence: 0.8 },
  { from: "اكرم", to: "أكرم", ruleId: "name-hamza", confidence: 0.8 },
  { from: "اشرف", to: "أشرف", ruleId: "name-hamza", confidence: 0.8 },
  { from: "امجد", to: "أمجد", ruleId: "name-hamza", confidence: 0.8 },
  { from: "اديب", to: "أديب", ruleId: "name-hamza", confidence: 0.75 },
  { from: "اسعد", to: "أسعد", ruleId: "name-hamza", confidence: 0.75 },
  { from: "اسماء", to: "أسماء", ruleId: "name-hamza", confidence: 0.85 },
  { from: "ايمان", to: "إيمان", ruleId: "name-hamza", confidence: 0.85 },
  { from: "ايهاب", to: "إيهاب", ruleId: "name-hamza", confidence: 0.8 },
  { from: "اياد", to: "إياد", ruleId: "name-hamza", confidence: 0.8 },
  { from: "الان", to: "الآن", ruleId: "hamza-ana" },
  { from: "اولا", to: "أولًا", ruleId: "hamza-ana", confidence: 0.75 },
  { from: "ثانيا", to: "ثانيًا", ruleId: "hamza-ana", confidence: 0.75 },
  { from: "ثالثا", to: "ثالثًا", ruleId: "hamza-ana", confidence: 0.75 },
  { from: "اخيرا", to: "أخيرًا", ruleId: "hamza-ana", confidence: 0.75 },
  { from: "ايضا", to: "أيضًا", ruleId: "hamza-ana" },
  { from: "مثلا", to: "مثلًا", ruleId: "hamza-ana", confidence: 0.8 },
  { from: "حتما", to: "حتمًا", ruleId: "hamza-ana", confidence: 0.75 },
  { from: "ابدًا", to: "أبدًا", ruleId: "hamza-ana", confidence: 0.7 },
  { from: "ابدا", to: "أبدًا", ruleId: "hamza-ana", confidence: 0.75 },
  { from: "اذا", to: "إذا", ruleId: "hamza-ana" },
  { from: "اذن", to: "إذن", ruleId: "hamza-ana", confidence: 0.7 },
  { from: "لان", to: "لأن", ruleId: "hamza-ana" },
  { from: "لاكن", to: "لكن", ruleId: "hamza-ana", confidence: 0.9 },
  { from: "هاذا", to: "هذا", ruleId: "hamza-ana", confidence: 0.9 },
  { from: "هذة", to: "هذه", ruleId: "ta-marbuta" },
  { from: "هاذه", to: "هذه", ruleId: "ta-marbuta", confidence: 0.85 },
  { from: "اولئك", to: "أولئك", ruleId: "hamza-ana" },
  { from: "اولئك", to: "أولئك", ruleId: "hamza-ana" },
  { from: "شئ", to: "شيء", ruleId: "hamza-ana", confidence: 0.85 },
  { from: "شي", to: "شيء", ruleId: "hamza-ana", confidence: 0.55 },
  { from: "مسؤليه", to: "مسؤولية", ruleId: "ta-marbuta", confidence: 0.8 },
  { from: "مسؤلية", to: "مسؤولية", ruleId: "ta-marbuta", confidence: 0.85 },
  { from: "المدرسه", to: "المدرسة", ruleId: "ta-marbuta" },
  { from: "مدرسه", to: "مدرسة", ruleId: "ta-marbuta" },
  { from: "جامعه", to: "جامعة", ruleId: "ta-marbuta" },
  { from: "لغه", to: "لغة", ruleId: "ta-marbuta" },
  { from: "كلمه", to: "كلمة", ruleId: "ta-marbuta" },
  { from: "فكره", to: "فكرة", ruleId: "ta-marbuta" },
  { from: "مسأله", to: "مسألة", ruleId: "ta-marbuta" },
  { from: "مشكله", to: "مشكلة", ruleId: "ta-marbuta" },
  { from: "مرحله", to: "مرحلة", ruleId: "ta-marbuta" },
  { from: "منطقه", to: "منطقة", ruleId: "ta-marbuta" },
  { from: "مدينه", to: "مدينة", ruleId: "ta-marbuta" },
  { from: "قريه", to: "قرية", ruleId: "ta-marbuta" },
  { from: "دولـه", to: "دولة", ruleId: "ta-marbuta", confidence: 0.7 },
  { from: "دوله", to: "دولة", ruleId: "ta-marbuta" },
  { from: "حكومه", to: "حكومة", ruleId: "ta-marbuta" },
  { from: "شركه", to: "شركة", ruleId: "ta-marbuta" },
  { from: "مؤسسه", to: "مؤسسة", ruleId: "ta-marbuta" },
  { from: "خدمه", to: "خدمة", ruleId: "ta-marbuta" },
  { from: "صفحه", to: "صفحة", ruleId: "ta-marbuta" },
  { from: "رساله", to: "رسالة", ruleId: "ta-marbuta" },
  { from: "كتابه", to: "كتابة", ruleId: "ta-marbuta", confidence: 0.55 },
  { from: "قراءه", to: "قراءة", ruleId: "ta-marbuta" },
  { from: "دراسه", to: "دراسة", ruleId: "ta-marbuta" },
  { from: "تجربه", to: "تجربة", ruleId: "ta-marbuta" },
  { from: "نتيجه", to: "نتيجة", ruleId: "ta-marbuta" },
  { from: "فرصه", to: "فرصة", ruleId: "ta-marbuta" },
  { from: "ضروره", to: "ضرورة", ruleId: "ta-marbuta" },
  { from: "اهميه", to: "أهمية", ruleId: "ta-marbuta" },
  { from: "حقيقه", to: "حقيقة", ruleId: "ta-marbuta" },
  { from: "طريقه", to: "طريقة", ruleId: "ta-marbuta" },
  { from: "وسيله", to: "وسيلة", ruleId: "ta-marbuta" },
  { from: "عمليه", to: "عملية", ruleId: "ta-marbuta" },
  { from: "نقطه", to: "نقطة", ruleId: "ta-marbuta" },
  { from: "لقطه", to: "لقطة", ruleId: "ta-marbuta" },
  { from: "صوره", to: "صورة", ruleId: "ta-marbuta" },
  { from: "ممتازه", to: "ممتازة", ruleId: "ta-marbuta" },
  { from: "مهمه", to: "مهمة", ruleId: "ta-marbuta" },
  { from: "جديده", to: "جديدة", ruleId: "ta-marbuta" },
  { from: "قديمه", to: "قديمة", ruleId: "ta-marbuta" },
  { from: "كبيره", to: "كبيرة", ruleId: "ta-marbuta" },
  { from: "صغيره", to: "صغيرة", ruleId: "ta-marbuta" },
  { from: "سريعه", to: "سريعة", ruleId: "ta-marbuta" },
  { from: "طويله", to: "طويلة", ruleId: "ta-marbuta" },
  { from: "قصيره", to: "قصيرة", ruleId: "ta-marbuta" },
  { from: "واضحة", to: "واضحة", ruleId: "ta-marbuta", confidence: 0 },
  { from: "واضحه", to: "واضحة", ruleId: "ta-marbuta" },
  { from: "صحيحه", to: "صحيحة", ruleId: "ta-marbuta" },
  { from: "خاطئه", to: "خاطئة", ruleId: "ta-marbuta" },
  { from: "فيديو", to: "فيديو", ruleId: "hamza-ana", confidence: 0 },
  { from: "انشاء", to: "إنشاء", ruleId: "hamza-ana" },
  { from: "ابدأ", to: "ابدأ", ruleId: "hamza-ana", confidence: 0 },
  { from: "ابداْ", to: "ابدأ", ruleId: "hamza-ana", confidence: 0.6 },
  { from: "اريد", to: "أريد", ruleId: "hamza-ana" },
  { from: "احب", to: "أحب", ruleId: "hamza-ana", confidence: 0.7 },
  { from: "احتاج", to: "أحتاج", ruleId: "hamza-ana" },
  { from: "استطيع", to: "أستطيع", ruleId: "hamza-ana" },
  { from: "اعتقد", to: "أعتقد", ruleId: "hamza-ana" },
  { from: "اظن", to: "أظن", ruleId: "hamza-ana" },
  { from: "اعرف", to: "أعرف", ruleId: "hamza-ana" },
  { from: "اراجع", to: "أراجع", ruleId: "hamza-ana" },
  { from: "اكتب", to: "أكتب", ruleId: "hamza-ana", confidence: 0.7 },
  { from: "اقرا", to: "أقرأ", ruleId: "hamza-ana", confidence: 0.75 },
  { from: "اقرأ", to: "أقرأ", ruleId: "hamza-ana" },
  { from: "اعمل", to: "أعمل", ruleId: "hamza-ana", confidence: 0.65 },
  { from: "افعل", to: "أفعل", ruleId: "hamza-ana", confidence: 0.6 },
  { from: "افهم", to: "أفهم", ruleId: "hamza-ana", confidence: 0.7 },
  { from: "اشاهد", to: "أشاهد", ruleId: "hamza-ana", confidence: 0.7 },
  { from: "استخدم", to: "أستخدم", ruleId: "hamza-ana" },
  { from: "افضل", to: "أفضل", ruleId: "hamza-ana", confidence: 0.65 },
  { from: "اكثر", to: "أكثر", ruleId: "hamza-ana" },
  { from: "اقل", to: "أقل", ruleId: "hamza-ana" },
  { from: "او", to: "أو", ruleId: "hamza-ana", confidence: 0.6 },
  { from: "ام", to: "أم", ruleId: "hamza-ana", confidence: 0.55 },
  { from: "اي", to: "أي", ruleId: "hamza-ana", confidence: 0.55 },
  { from: "اين", to: "أين", ruleId: "hamza-ana" },
  { from: "متى", to: "متى", ruleId: "hamza-ana", confidence: 0 },
  { from: "كيف", to: "كيف", ruleId: "hamza-ana", confidence: 0 },
  { from: "لماذا", to: "لماذا", ruleId: "hamza-ana", confidence: 0 },
  { from: "لانها", to: "لأنها", ruleId: "hamza-ana" },
  { from: "لانه", to: "لأنه", ruleId: "hamza-ana" },
  { from: "انهم", to: "أنهم", ruleId: "hamza-ana" },
  { from: "انها", to: "أنها", ruleId: "hamza-ana" },
  { from: "انه", to: "أنه", ruleId: "hamza-ana", confidence: 0.7 },
  { from: "انني", to: "أنني", ruleId: "hamza-ana" },
  { from: "اني", to: "أني", ruleId: "hamza-ana", confidence: 0.65 },
  { from: "إنشاءالله", to: "إن شاء الله", ruleId: "hamza-ana", confidence: 0.85 },
  { from: "انشاءالله", to: "إن شاء الله", ruleId: "hamza-ana", confidence: 0.9 },
  { from: "إنشالله", to: "إن شاء الله", ruleId: "hamza-ana", confidence: 0.85 },
  { from: "ماشاءالله", to: "ما شاء الله", ruleId: "hamza-ana", confidence: 0.85 },
  { from: "جزاك الله", to: "جزاك الله", ruleId: "hamza-ana", confidence: 0 },
  { from: "السلام عليكم", to: "السلام عليكم", ruleId: "hamza-ana", confidence: 0 },
];

const ALEF_FARQ =
  /(?<![\u0600-\u06FFa-zA-Z0-9])([\u0621-\u064A]{2,14}و)(?=[\s.,،؛؟!)]|$)/g;

export function collectSpellingEdits(
  text: string,
  locale: Locale = "ar",
): LughawiEdit[] {
  const edits: LughawiEdit[] = [];
  let seq = 0;

  const expandedBuiltin = BUILTIN_SPELLING.filter(
    (p) => p.from !== p.to && (p.confidence ?? 1) > 0,
  ).flatMap((p) => {
    const rows = [{ ...p, learned: false as const }];
    const skipAl =
      p.ruleId === "ya-preposition" ||
      p.ruleId === "ila-preposition" ||
      p.ruleId === "name-ali" ||
      p.from.length <= 2;
    if (
      !skipAl &&
      !p.from.startsWith("ال") &&
      !p.to.startsWith("ال")
    ) {
      rows.push({
        ...p,
        from: `ال${p.from}`,
        to: `ال${p.to}`,
        confidence: Math.min(0.92, (p.confidence ?? 0.9) + 0.02),
        learned: false as const,
      });
    }
    return rows;
  });

  const pairs = [
    ...getActiveLearnedPairs().map((p) => ({
      from: p.from,
      to: p.to,
      ruleId: p.ruleId ?? "learned",
      confidence: p.confidence,
      learned: true as const,
    })),
    ...expandedBuiltin,
  ];

  // Prefer longer matches first to avoid partial collisions.
  pairs.sort((a, b) => b.from.length - a.from.length);

  const claimed = new Set<string>();

  for (const rule of pairs) {
    if (isPairSuppressed(rule.from, rule.to)) continue;
    const re = wordRe(rule.from);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0]!.length;
      const key = `${start}:${end}`;
      if (claimed.has(key)) continue;
      if (m[0] === rule.to) continue;
      claimed.add(key);
      seq += 1;
      edits.push(
        wordEdit(
          text,
          start,
          end,
          rule.to,
          rule.ruleId,
          locale,
          nextId(rule.learned ? "ln" : "sp", seq),
          rule.confidence ?? 0.9,
          rule.learned ? "rules" : "rules",
        ),
      );
    }
  }

  ALEF_FARQ.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ALEF_FARQ.exec(text)) !== null) {
    const stem = m[1]!;
    if (stem.endsWith("وا") || stem.length < 3) continue;
    // Skip common nouns ending with و
    if (/^(هو|ذو|أبو|بنو)$/.test(stem)) continue;
    const start = m.index;
    const end = start + stem.length;
    const key = `${start}:${end}`;
    if (claimed.has(key)) continue;
    if (isPairSuppressed(stem, `${stem}ا`)) continue;
    claimed.add(key);
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
        0.55,
      ),
    );
  }

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

  // على → علي when it is clearly a person name after meeting/address verbs.
  const nameAliRe =
    /(?<![\u0600-\u06FFa-zA-Z0-9])(قابل|قابلت|قابله|زرت|زار|رأيت|رأى|لقيت|لَقيت|كلمت|كلّمت|ناديت|نادى|سميت|سمّيت|اسمه|يدعى|يُدعى|مع|إلى|الى)\s+على(?![\u0600-\u06FFa-zA-Z0-9])/g;
  let nm: RegExpExecArray | null;
  while ((nm = nameAliRe.exec(text)) !== null) {
    const full = nm[0]!;
    const start = nm.index + full.lastIndexOf("على");
    const end = start + "على".length;
    const key = `${start}:${end}`;
    if (claimed.has(key)) continue;
    if (isPairSuppressed("على", "علي")) continue;
    claimed.add(key);
    seq += 1;
    edits.push(
      wordEdit(
        text,
        start,
        end,
        "علي",
        "name-ali",
        locale,
        nextId("sp", seq),
        0.88,
      ),
    );
  }

  return edits.sort((a, b) => a.start - b.start || b.end - a.end);
}
