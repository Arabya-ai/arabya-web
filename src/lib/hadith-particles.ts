/**
 * Closed-class / high-frequency particles common in hadith matn.
 * Keys MUST already match normalizeArabicToken() output (no tashkeel;
 * أإآٱ→ا, ىي→ي, ة→ه).
 */
export type ParticleEntry = {
  labelAr: string;
  labelEn: string;
  kind: "particle" | "pronoun" | "proper";
};

export const HADITH_PARTICLES: Record<string, ParticleEntry> = {
  في: { labelAr: "حرف جر", labelEn: "Preposition", kind: "particle" },
  من: { labelAr: "حرف جر", labelEn: "Preposition", kind: "particle" },
  الي: { labelAr: "حرف جر", labelEn: "Preposition", kind: "particle" },
  علي: { labelAr: "حرف جر", labelEn: "Preposition", kind: "particle" },
  عن: { labelAr: "حرف جر", labelEn: "Preposition", kind: "particle" },
  ب: { labelAr: "حرف جر", labelEn: "Preposition", kind: "particle" },
  ل: { labelAr: "حرف جر / لام", labelEn: "Preposition / lām", kind: "particle" },
  ك: { labelAr: "حرف جر / كاف", labelEn: "Preposition / kāf", kind: "particle" },
  و: { labelAr: "حرف عطف", labelEn: "Conjunction", kind: "particle" },
  ف: { labelAr: "حرف عطف", labelEn: "Conjunction", kind: "particle" },
  ثم: { labelAr: "حرف عطف", labelEn: "Conjunction", kind: "particle" },
  او: { labelAr: "حرف عطف", labelEn: "Conjunction", kind: "particle" },
  ان: {
    labelAr: "حرف توكيد ونصب / أنّ",
    labelEn: "Accusative emphatic (inna/anna)",
    kind: "particle",
  },
  انما: { labelAr: "أداة حصر", labelEn: "Restriction particle", kind: "particle" },
  لا: { labelAr: "حرف نفي", labelEn: "Negation", kind: "particle" },
  ما: {
    labelAr: "حرف نفي / موصول / استفهام (بحسب السياق)",
    labelEn: "Negation / relative / interrogative",
    kind: "particle",
  },
  لم: { labelAr: "حرف جزم ونفي", labelEn: "Jussive negation", kind: "particle" },
  لن: { labelAr: "حرف نصب ونفي", labelEn: "Future negation", kind: "particle" },
  قد: { labelAr: "حرف تحقيق", labelEn: "Certainty particle", kind: "particle" },
  قال: {
    labelAr: "فعل ماضٍ (صيغة شائعة في الإسناد)",
    labelEn: "Perfect verb (common in isnād)",
    kind: "particle",
  },
  قالت: {
    labelAr: "فعل ماضٍ للمؤنث",
    labelEn: "Perfect verb (feminine)",
    kind: "particle",
  },
  حدثنا: {
    labelAr: "صيغة تحديث (إسناد)",
    labelEn: "Transmission formula",
    kind: "particle",
  },
  حدثني: {
    labelAr: "صيغة تحديث (إسناد)",
    labelEn: "Transmission formula",
    kind: "particle",
  },
  اخبرنا: {
    labelAr: "صيغة إخبار (إسناد)",
    labelEn: "Transmission formula",
    kind: "particle",
  },
  اخبرني: {
    labelAr: "صيغة إخبار (إسناد)",
    labelEn: "Transmission formula",
    kind: "particle",
  },
  سمعت: {
    labelAr: "فعل سماع (إسناد)",
    labelEn: "Hearing formula",
    kind: "particle",
  },
  رضي: {
    labelAr: "دعاء / صيغة ثناء",
    labelEn: "Honorific formula",
    kind: "particle",
  },
  صلي: {
    labelAr: "صيغة صلاة على النبي",
    labelEn: "Ṣalāh formula upon the Prophet",
    kind: "particle",
  },
  وسلم: {
    labelAr: "صيغة تسليم تابعة للصلاة على النبي",
    labelEn: "Salām formula with ṣalāh on the Prophet",
    kind: "particle",
  },
  الا: {
    labelAr: "أداة استثناء / تنبيه (بحسب السياق)",
    labelEn: "Exceptive / attention particle",
    kind: "particle",
  },
  هذا: {
    labelAr: "اسم إشارة",
    labelEn: "Demonstrative",
    kind: "particle",
  },
  هذه: {
    labelAr: "اسم إشارة للمؤنث",
    labelEn: "Demonstrative (feminine)",
    kind: "particle",
  },
  فقال: {
    labelAr: "فعل قول معطوف (شائع في المتون)",
    labelEn: "Speech verb with fa-",
    kind: "particle",
  },
  الله: {
    labelAr: "علم — لفظ الجلالة",
    labelEn: "Proper noun — Allah",
    kind: "proper",
  },
  رسول: { labelAr: "اسم", labelEn: "Noun", kind: "particle" },
  النبي: { labelAr: "اسم", labelEn: "Noun", kind: "particle" },
};
