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
  "ya-preposition": {
    ruleId: "ya-preposition",
    titleAr: "في بالياء",
    titleEn: "Preposition في",
    bodyAr: "حرف الجر «في» يُكتب بياء، لا بألف مقصورة «فى».",
    bodyEn: "The preposition «في» ends with yaa, not alif maqsura.",
    exampleAr: "في المدرسة · لا: فى المدرسة",
  },
  "name-hamza": {
    ruleId: "name-hamza",
    titleAr: "همزة القطع في الأسماء",
    titleEn: "Hamza in proper names",
    bodyAr: "أسماء مثل «أحمد» و«إبراهيم» تُكتب بهمزة قطع ظاهرة في الفصحى.",
    bodyEn: "Names such as «أحمد» take a visible hamza in MSA.",
    exampleAr: "أحمد · لا: احمد",
  },
  "name-ali": {
    ruleId: "name-ali",
    titleAr: "علي اسم شخص",
    titleEn: "Ali as a personal name",
    bodyAr: "بعد أفعال اللقاء والنداء يُرجَّح أن تكون «علي» اسم علم بالياء، لا حرف الجر «على».",
    bodyEn: "After meeting/address verbs, «علي» is usually a personal name (yaa), not the preposition «على».",
    exampleAr: "قابل علي · ساعد علي · لا: قابل على / ساعد على",
  },
  "ta-marbuta": {
    ruleId: "ta-marbuta",
    titleAr: "التاء المربوطة",
    titleEn: "Ta marbuta",
    bodyAr: "الأسماء المؤنثة المختومة بتاء مربوطة تُكتب «ة» لا «ه» في الفصحى المكتوبة.",
    bodyEn: "Feminine nouns often end with ة, not ه, in MSA writing.",
    exampleAr: "بقرة · مدرسة · لا: بقره / مدرسه",
  },
  "hamza-qara": {
    ruleId: "hamza-qara",
    titleAr: "همزة «قرأ»",
    titleEn: "Hamza in قرأ",
    bodyAr: "فعل «قرأ» ومضارعه «يقرأ / تقرأ / نقرأ / أقرأ» بهمزة على الألف، لا «تقرا» بلا همزة.",
    bodyEn: "The verb «قرأ» and its imperfect forms take a hamza: تقرأ not تقرا.",
    exampleAr: "تقرأ كتابًا · لا: تقرا كتاب",
  },
  "accusative-object": {
    ruleId: "accusative-object",
    titleAr: "المفعول به منصوب",
    titleEn: "Accusative object",
    bodyAr: "المفعول به بعد فعل متعدٍّ مثل «قرأ / تقرأ» يُنصب؛ «كتاب» تصير «كتابًا».",
    bodyEn: "The direct object after a transitive verb like «تقرأ» takes accusative: كتابًا.",
    exampleAr: "تقرأ كتابًا · لا: تقرأ كتاب",
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
    bodyAr: "اسم الإشارة يتطابق مع المشار إليه في التذكير والتأنيث.",
    bodyEn: "Demonstratives usually agree with the noun in gender.",
  },
  "an-masdar": {
    ruleId: "an-masdar",
    titleAr: "أن المصدرية",
    titleEn: "An of the masdar",
    bodyAr: "بعد أفعال مثل يجب/يمكن/ينبغي وبعد قبل/بعد تُكتب «أن» بهمزة قطع.",
    bodyEn: "After verbs like يجب/يمكن and before/after, use «أن» with hamza.",
    exampleAr: "يجب أن أكتب · قبل أن أذهب",
  },
  "lam-jussive": {
    ruleId: "lam-jussive",
    titleAr: "لم والفعل المجزوم",
    titleEn: "Lam + jussive",
    bodyAr: "بعد «لم» يُجزم المضارع؛ صيغة الجمع الشائعة «يكتبوا» لا «يكتبون».",
    bodyEn: "After لم the imperfect is jussive; plural often ends with وا not ون.",
  },
  "lan-nasb": {
    ruleId: "lan-nasb",
    titleAr: "لن والفعل المنصوب",
    titleEn: "Lan + subjunctive",
    bodyAr: "بعد «لن» يُنصب المضارع؛ صيغة الجمع الشائعة تنتهي بـ«وا».",
    bodyEn: "After لن the imperfect is subjunctive; plural often ends with وا.",
  },
  "ar-comma": {
    ruleId: "ar-comma",
    titleAr: "الفاصلة العربية",
    titleEn: "Arabic comma",
    bodyAr: "في النص العربي الفصيح تُفضَّل الفاصلة العربية «،» على الفاصلة اللاتينية.",
    bodyEn: "Prefer the Arabic comma «،» in MSA prose.",
  },
  "ar-question": {
    ruleId: "ar-question",
    titleAr: "علامة الاستفهام العربية",
    titleEn: "Arabic question mark",
    bodyAr: "بعد الجملة العربية الاستفهامية تُستخدم «؟» لا «؟» اللاتينية المقلوبة شكليًا.",
    bodyEn: "Use the Arabic question mark «؟» after Arabic questions.",
  },
  "ar-semicolon": {
    ruleId: "ar-semicolon",
    titleAr: "الفاصلة المنقوطة العربية",
    titleEn: "Arabic semicolon",
    bodyAr: "الفاصلة المنقوطة العربية «؛» أنسب للنص الفصيح من النسخة اللاتينية.",
    bodyEn: "Prefer Arabic semicolon «؛» in MSA text.",
  },
  "punct-after": {
    ruleId: "punct-after",
    titleAr: "مسافة بعد الترقيم",
    titleEn: "Space after punctuation",
    bodyAr: "اترك مسافة بعد علامة الترقيم قبل الكلمة التالية.",
    bodyEn: "Leave a space after punctuation before the next word.",
  },
  "style-connective": {
    ruleId: "style-connective",
    titleAr: "أكثر مما",
    titleEn: "More than what",
    bodyAr: "الصيغة الفصيحة «أكثر مما» أدق من «أكثر من ما» في كثير من السياقات.",
    bodyEn: "«أكثر مما» is the usual MSA connective form.",
  },
  "style-redundant": {
    ruleId: "style-redundant",
    titleAr: "تكرار وجودي",
    titleEn: "Existential redundancy",
    bodyAr: "«هناك يوجد» تكرار؛ يكفي غالبًا «يوجد» أو «هناك».",
    bodyEn: "«هناك يوجد» is redundant; prefer «يوجد» or «هناك».",
  },
  "num-agreement": {
    ruleId: "num-agreement",
    titleAr: "العدد والمعدود",
    titleEn: "Number–noun agreement",
    bodyAr: "من 3 إلى 10 يخالف العدد المعدود في التذكير والتأنيث في الفصحى الشائعة.",
    bodyEn: "For 3–10, MSA number gender usually disagrees with the counted noun.",
    exampleAr: "ثلاثة كتب · ثلاث مدارس",
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
