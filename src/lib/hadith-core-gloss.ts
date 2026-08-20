/**
 * High-frequency hadith matn lemmas that often miss Quran surface match
 * (plurals / derived forms). Short traditional Arabic glosses only.
 * Keys: normalizeArabicToken output.
 */
export type HadithCoreGloss = {
  root?: string;
  lemma?: string;
  pos?: string[];
  senseAr: string;
  senseEn: string;
};

export const HADITH_CORE_GLOSS: Record<string, HadithCoreGloss> = {
  اعمال: {
    root: "عمل",
    lemma: "أعمال",
    pos: ["N"],
    senseAr: "جمع عمل: الأفعال والتصرفات التي يحاسب عليها العبد.",
    senseEn: "Plural of ʿamal: deeds and actions.",
  },
  عمل: {
    root: "عمل",
    lemma: "عمل",
    pos: ["N"],
    senseAr: "الفعل الصادر عن المكلّف؛ في الحديث يُقرن كثيرًا بالنية.",
    senseEn: "Deed/act; often paired with intention in hadith.",
  },
  نيه: {
    root: "نوي",
    lemma: "نية",
    pos: ["N"],
    senseAr: "القصد والعزم في القلب على الفعل؛ مدار صحة كثير من الأعمال.",
    senseEn: "Intention; resolve in the heart behind an act.",
  },
  نيات: {
    root: "نوي",
    lemma: "نيات",
    pos: ["N"],
    senseAr: "جمع نية: المقصودات الباطنة التي تُميّز الأعمال.",
    senseEn: "Plural of niyya: inner intentions.",
  },
  نوي: {
    root: "نوي",
    lemma: "نوى",
    pos: ["V"],
    senseAr: "قصد وعزم؛ «ما نوى» أي ما قصده في باطنه.",
    senseEn: "Intended / resolved.",
  },
  هجره: {
    root: "هجر",
    lemma: "هجرة",
    pos: ["N"],
    senseAr: "الانتقال وترك الوطن؛ وفي الشرع هجرة إلى الله ورسوله.",
    senseEn: "Migration / hijra.",
  },
  هجرت: {
    root: "هجر",
    lemma: "هجرة",
    pos: ["N"],
    senseAr: "الانتقال وترك الوطن؛ وفي الشرع هجرة إلى الله ورسوله.",
    senseEn: "Migration / hijra.",
  },
  دنيا: {
    root: "دنو",
    lemma: "دنيا",
    pos: ["N"],
    senseAr: "الحياة الحاضرة وما فيها من متاع زائل مقابل الآخرة.",
    senseEn: "This world / worldly life.",
  },
  يصيب: {
    root: "صوب",
    lemma: "أصاب",
    pos: ["V"],
    senseAr: "ينال ويبلغ؛ «لدنيا يصيبها» أي يطلب متاعًا يناله.",
    senseEn: "To obtain / reach.",
  },
  امرئ: {
    root: "مرأ",
    lemma: "امرئ",
    pos: ["N"],
    senseAr: "الإنسان / الشخص.",
    senseEn: "Person / man.",
  },
  امراة: {
    root: "مرأ",
    lemma: "امرأة",
    pos: ["N"],
    senseAr: "أنثى من البشر.",
    senseEn: "Woman.",
  },
};
