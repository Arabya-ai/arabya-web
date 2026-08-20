/**
 * Lightweight hadith rhetoric notes — formulas and discourse patterns,
 * not full classical balāgha for every token.
 */
import { normalizeArabicToken } from "@/lib/tahfeez/normalize";
import { candidateKeys } from "@/lib/hadith-token-keys";

export type RhetoricNote = {
  ar: string;
  en: string;
  kind: "formula" | "restriction" | "simile" | "emphasis" | "topic";
};

const BY_NORM: Record<string, RhetoricNote> = {
  انما: {
    kind: "restriction",
    ar: "أداة حصر: تقصر الحكم على ما بعدها («إنما الأعمال بالنيات»).",
    en: "Restriction particle: confines the ruling to what follows.",
  },
  حدثنا: {
    kind: "formula",
    ar: "صيغة تحمّل/أداء في الإسناد؛ علامة نقل السند لا جزءًا من المتن المقصود بالحكم.",
    en: "Isnād transmission formula; chain language, not the legal matn.",
  },
  حدثني: {
    kind: "formula",
    ar: "صيغة إسناد فردية («حدّثني») تميّز طريق التحمّل.",
    en: "Singular transmission formula in the chain.",
  },
  اخبرنا: {
    kind: "formula",
    ar: "صيغة إخبار في الإسناد.",
    en: "Report formula in the isnād.",
  },
  اخبرني: {
    kind: "formula",
    ar: "صيغة إخبار فردية في الإسناد.",
    en: "Singular report formula in the isnād.",
  },
  قال: {
    kind: "formula",
    ar: "فعل القول يفتح حكاية المتن أو حلقة السند.",
    en: "Speech verb introducing narration or chain link.",
  },
  فقال: {
    kind: "formula",
    ar: "استمرار الحوار بصيغة «فقال» في سرد المتن.",
    en: "Narrative continuity with fa- + qāla.",
  },
  الا: {
    kind: "emphasis",
    ar: "«ألا» الاستفتاحية للتنبيه وتوكيد ما بعدها (أو استثناء بحسب السياق).",
    en: "Attention / exceptive particle by context.",
  },
  كالراعي: {
    kind: "simile",
    ar: "تشبيه تمثيلي: حال المتلبس بالشبهات بحال الراعي حول الحمى.",
    en: "Extended simile: one near doubtful matters like a shepherd near a sanctuary.",
  },
  راعي: {
    kind: "simile",
    ar: "في التشبيه النبوي: الراعي حول الحمى مثل من يقارب المحرّم.",
    en: "In the prophetic simile: shepherd near the sanctuary.",
  },
  حمي: {
    kind: "simile",
    ar: "استعارة/تشبيه: حمى الملك يقابل محارم الله.",
    en: "Metaphor: a king’s sanctuary stands for Allah’s prohibitions.",
  },
  مضغه: {
    kind: "topic",
    ar: "كناية وتمثيل: المضغة = القلب؛ صلاح الظاهر بصلاح الباطن.",
    en: "Figurative: the “morsel” is the heart; outer soundness follows the inner.",
  },
  نيات: {
    kind: "topic",
    ar: "محور جوامع الكلم: ربط ظاهر العمل بباطن القصد.",
    en: "Core of concise prophetic speech: linking outward deeds to inward intent.",
  },
  نيه: {
    kind: "topic",
    ar: "محور جوامع الكلم: النية تُميّز العمل.",
    en: "Intention distinguishes the deed.",
  },
  صلي: {
    kind: "formula",
    ar: "صيغة تعظيم نبوي ضمن سلسلة الصلاة والسلام.",
    en: "Prophetic honorific within the ṣalāh-and-salām formula.",
  },
  وسلم: {
    kind: "formula",
    ar: "تتمة صيغة الصلاة والسلام على النبي ﷺ.",
    en: "Completion of the ṣalāh-and-salām formula.",
  },
};

/** Resolve rhetoric for a surface token (normalized + clitics). */
export function rhetoricForToken(surface: string): RhetoricNote | null {
  const norm = normalizeArabicToken(
    String(surface || "").replace(/[\u060C\u061B\u061F\u06D4]/g, ""),
  );
  if (!norm) return null;
  for (const key of candidateKeys(norm)) {
    const hit = BY_NORM[key];
    if (hit) return hit;
  }
  return null;
}
