/** Bilingual labels for Quranic Arabic Corpus POS / particle / feature tags. */

export type MorphLocale = "ar" | "en";

type LabelMap = Record<string, { ar: string; en: string }>;

const TYPE_LABELS: LabelMap = {
  N: { ar: "اسم", en: "Noun" },
  PN: { ar: "علم", en: "Proper noun" },
  PRON: { ar: "ضمير", en: "Pronoun" },
  DEM: { ar: "اسم إشارة", en: "Demonstrative" },
  REL: { ar: "اسم موصول", en: "Relative" },
  T: { ar: "ظرف زمان", en: "Time adverb" },
  LOC: { ar: "ظرف مكان", en: "Location adverb" },
  V: { ar: "فعل", en: "Verb" },
  NV: { ar: "اسم فعل", en: "Verbal noun (ism fiʿl)" },
  COND: { ar: "أداة شرط", en: "Conditional" },
  INTG: { ar: "أداة استفهام", en: "Interrogative" },
  ADJ: { ar: "صفة", en: "Adjective" },
};

const PARTICLE_LABELS: LabelMap = {
  P: { ar: "حرف جر", en: "Preposition" },
  DET: { ar: "أل التعريف", en: "Definite article" },
  CONJ: { ar: "حرف عطف", en: "Conjunction" },
  NEG: { ar: "حرف نفي", en: "Negation" },
  EMPH: { ar: "لام التوكيد", en: "Emphasis lām" },
  VOC: { ar: "حرف نداء", en: "Vocative" },
  FUT: { ar: "حرف استقبال", en: "Future particle" },
  ACC: { ar: "حرف نصب", en: "Accusative particle" },
  SUB: { ar: "حرف مصدري", en: "Subordinating particle" },
  REL_PART: { ar: "اسم موصول", en: "Relative particle" },
  INL: { ar: "حروف مقطعة", en: "Disconnected letters" },
  ATT: { ar: "حرف تنبيه", en: "Attention particle" },
  DIST: { ar: "لام البعد", en: "Distance lām" },
  ADDR: { ar: "كاف الخطاب", en: "Address kāf" },
  REM: { ar: "استئناف", en: "Resumption" },
  RES: { ar: "حصر", en: "Restriction" },
  INC: { ar: "ابتداء", en: "Inceptive" },
  EXL: { ar: "استثناء", en: "Exception" },
  AVR: { ar: "ردع", en: "Aversion" },
  EXP: { ar: "تفسير", en: "Explanation" },
  CAUS: { ar: "سببية", en: "Causative" },
  CERT: { ar: "توكيد", en: "Certainty" },
  PRD: { ar: "جواب", en: "Predicate reply" },
  ANS: { ar: "جواب", en: "Answer" },
  RSLT: { ar: "جواب شرط", en: "Conditional result" },
  SUP: { ar: "زائد", en: "Extra" },
  INT: { ar: "تفسير", en: "Interpretive" },
};

const FEATURE_LABELS: LabelMap = {
  NOM: { ar: "مرفوع", en: "Nominative" },
  ACC: { ar: "منصوب", en: "Accusative" },
  GEN: { ar: "مجرور", en: "Genitive" },
  PERF: { ar: "ماضٍ", en: "Perfect" },
  IMPF: { ar: "مضارع", en: "Imperfect" },
  IMPV: { ar: "أمر", en: "Imperative" },
  IND: { ar: "مرفوع", en: "Indicative" },
  SUBJ: { ar: "منصوب", en: "Subjunctive" },
  JUS: { ar: "مجزوم", en: "Jussive" },
  "MOOD:IND": { ar: "مرفوع", en: "Indicative" },
  "MOOD:SUBJ": { ar: "منصوب", en: "Subjunctive" },
  "MOOD:JUS": { ar: "مجزوم", en: "Jussive" },
  ACT: { ar: "مبني للمعلوم", en: "Active" },
  PASS: { ar: "مبني للمجهول", en: "Passive" },
  ACT_PCPL: { ar: "اسم فاعل", en: "Active participle" },
  PASS_PCPL: { ar: "اسم مفعول", en: "Passive participle" },
  VN: { ar: "مصدر", en: "Verbal noun" },
  ADJ: { ar: "صفة", en: "Adjective" },
  M: { ar: "مذكر", en: "Masculine" },
  F: { ar: "مؤنث", en: "Feminine" },
  S: { ar: "مفرد", en: "Singular" },
  D: { ar: "مثنى", en: "Dual" },
  P: { ar: "جمع", en: "Plural" },
  MS: { ar: "مذكر مفرد", en: "Masculine singular" },
  MD: { ar: "مذكر مثنى", en: "Masculine dual" },
  MP: { ar: "مذكر جمع", en: "Masculine plural" },
  FS: { ar: "مؤنث مفرد", en: "Feminine singular" },
  FD: { ar: "مؤنث مثنى", en: "Feminine dual" },
  FP: { ar: "مؤنث جمع", en: "Feminine plural" },
  "1S": { ar: "متكلم مفرد", en: "1st singular" },
  "1P": { ar: "متكلم جمع", en: "1st plural" },
  "2MS": { ar: "مخاطب مذكر مفرد", en: "2nd masc. singular" },
  "2FS": { ar: "مخاطب مؤنث مفرد", en: "2nd fem. singular" },
  "2MP": { ar: "مخاطب مذكر جمع", en: "2nd masc. plural" },
  "2FP": { ar: "مخاطب مؤنث جمع", en: "2nd fem. plural" },
  "2D": { ar: "مخاطب مثنى", en: "2nd dual" },
  "3MS": { ar: "غائب مذكر مفرد", en: "3rd masc. singular" },
  "3FS": { ar: "غائب مؤنث مفرد", en: "3rd fem. singular" },
  "3MP": { ar: "غائب مذكر جمع", en: "3rd masc. plural" },
  "3FP": { ar: "غائب مؤنث جمع", en: "3rd fem. plural" },
  "3D": { ar: "غائب مثنى", en: "3rd dual" },
  SP: { ar: "اسم تفضيل", en: "Elative" },
  IM: { ar: "صيغة مبالغة", en: "Intensive" },
  INDEF: { ar: "نكرة", en: "Indefinite" },
  DEF: { ar: "معرفة", en: "Definite" },
  PREFIX: { ar: "سابقة", en: "Prefix" },
  SUFFIX: { ar: "لاحقة", en: "Suffix" },
  STEM: { ar: "جذع", en: "Stem" },
};

const CONTENT_FIRST = [
  "V",
  "N",
  "PN",
  "PRON",
  "DEM",
  "REL",
  "T",
  "LOC",
  "NV",
  "COND",
  "INTG",
  "DET",
];

function pick(entry: { ar: string; en: string } | undefined, locale: MorphLocale): string {
  if (!entry) return "";
  return entry[locale] || entry.ar;
}

export function labelPosCode(code: string, locale: MorphLocale = "ar"): string {
  return (
    pick(TYPE_LABELS[code], locale) ||
    pick(PARTICLE_LABELS[code], locale) ||
    ""
  );
}

/** Ordered POS labels for display (content categories first). */
export function formatPosLabels(
  pos: string[] | undefined,
  features?: string[],
  locale: MorphLocale = "ar",
): string {
  if (!pos?.length) return "";
  const f = features ?? [];
  const hasPn = pos.includes("PN") || f.includes("PN");
  const ordered = [
    ...CONTENT_FIRST.filter((c) => pos.includes(c)),
    ...pos.filter((c) => !CONTENT_FIRST.includes(c)),
  ];
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const code of ordered) {
    let label = labelPosCode(code, locale);
    if (!label) continue;
    if (code === "N" && hasPn) label = pick(TYPE_LABELS.PN, locale);
    if (seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels.join(" · ");
}

/** Human-readable feature chips — never show raw English codes. */
export function formatFeatureLabels(
  features: string[] | undefined,
  locale: MorphLocale = "ar",
): string {
  if (!features?.length) return "";
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const raw of features) {
    if (
      raw.startsWith("LEM:") ||
      raw.startsWith("ROOT:") ||
      raw.startsWith("POS:") ||
      raw.startsWith("VF:") ||
      raw.startsWith("PRON:")
    ) {
      continue;
    }
    const entry =
      FEATURE_LABELS[raw] || FEATURE_LABELS[raw.replace(/^MOOD:/, "")];
    const label = pick(entry, locale);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels.join(" · ");
}
