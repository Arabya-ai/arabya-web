/** Rule note catalog — Arabic explanations shown to users. */

export interface RuleNote {
  ruleId: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  exampleAr?: string;
}

export const RULE_NOTES: Record<string, RuleNote> = {
  "hamza-ana": {
    ruleId: "hamza-ana",
    titleAr: "همزة القطع في الضمائر",
    titleEn: "Hamza in pronouns",
    bodyAr: "الضمائر المنفصلة مثل «أنا» تُكتب بهمزة قطع ظاهرة.",
    bodyEn: "Independent pronouns such as «أنا» take a visible hamza.",
    exampleAr: "أنا طالب · لا: انا طالب",
  },
  "ila-preposition": {
    ruleId: "ila-preposition",
    titleAr: "إلى بحرف الألف",
    titleEn: "Preposition إلى",
    bodyAr: "حرف الجر «إلى» يُكتب بألف مقصورة في آخره، وليس «الى» بلا همزة سياقًا شائعًا يُصحَّح إلى «إلى».",
    bodyEn: "The preposition «إلى» ends with alif maqsura.",
    exampleAr: "ذهبت إلى المدرسة",
  },
  "ta-marbuta": {
    ruleId: "ta-marbuta",
    titleAr: "التاء المربوطة",
    titleEn: "Ta marbuta",
    bodyAr: "الأسماء المؤنثة المختومة بتاء مربوطة تُكتب «ة» لا «ه» في الفصحى المكتوبة.",
    bodyEn: "Feminine nouns often end with ة, not ه, in MSA writing.",
    exampleAr: "مدرسة · شجرة",
  },
  "alef-farq": {
    ruleId: "alef-farq",
    titleAr: "ألف التفريق",
    titleEn: "Discriminating alif",
    bodyAr: "واو الجماعة في الأفعال تُتبع غالبًا بألف التفريق: كتبوا لا كتبوا بلا ألف في مواضع كثيرة.",
    bodyEn: "Plural verb endings often take the discriminating alif: كتبوا.",
  },
  "double-space": {
    ruleId: "double-space",
    titleAr: "المسافات الزائدة",
    titleEn: "Extra spaces",
    bodyAr: "تجنّب المضاعفة العشوائية للمسافات داخل الجملة.",
    bodyEn: "Avoid doubled spaces inside a sentence.",
  },
  "punct-space": {
    ruleId: "punct-space",
    titleAr: "مسافة قبل الترقيم",
    titleEn: "Space before punctuation",
    bodyAr: "لا تُترك مسافة قبل علامة الترقيم العربية (، ؛ ؟ ! .).",
    bodyEn: "Do not leave a space before Arabic punctuation marks.",
  },
  "inna-nasb": {
    ruleId: "inna-nasb",
    titleAr: "إنّ وأخواتها",
    titleEn: "Inna and sisters",
    bodyAr: "اسم «إنّ» منصوب؛ تجنّب رفعه حين يظهر الضبط أو الصيغة الشائعة الخاطئة.",
    bodyEn: "The subject of إنّ is accusative in MSA.",
  },
  "agreement-demo": {
    ruleId: "agreement-demo",
    titleAr: "التطابق",
    titleEn: "Agreement",
    bodyAr: "الصفة تتبع الموصوف في التذكير والتأنيث والتعريف غالبًا.",
    bodyEn: "Adjectives usually agree with the noun they modify.",
  },
};

export function explainRule(
  ruleId: string,
  locale: "ar" | "en" = "ar",
): string {
  const note = RULE_NOTES[ruleId];
  if (!note) {
    return locale === "en"
      ? "Suggested correction based on MSA usage."
      : "اقتراح تصحيحي وفق العربية الفصحى.";
  }
  return locale === "en" ? note.bodyEn : note.bodyAr;
}
