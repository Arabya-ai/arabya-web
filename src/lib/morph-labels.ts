/** Arabic labels for Quranic Arabic Corpus POS / particle / feature tags. */
const TYPE_LABELS: Record<string, string> = {
  N: "اسم",
  PN: "علم",
  PRON: "ضمير",
  DEM: "اسم إشارة",
  REL: "اسم موصول",
  T: "ظرف زمان",
  LOC: "ظرف مكان",
  V: "فعل",
  NV: "اسم فعل",
  COND: "أداة شرط",
  INTG: "أداة استفهام",
  ADJ: "صفة",
};

const PARTICLE_LABELS: Record<string, string> = {
  P: "حرف جر",
  DET: "أل التعريف",
  CONJ: "حرف عطف",
  NEG: "حرف نفي",
  EMPH: "لام التوكيد",
  VOC: "حرف نداء",
  FUT: "حرف استقبال",
  ACC: "حرف نصب",
  SUB: "حرف مصدري",
  REL_PART: "اسم موصول",
  INL: "حروف مقطعة",
  ATT: "حرف تنبيه",
  DIST: "لام البعد",
  ADDR: "كاف الخطاب",
  REM: "استئناف",
  RES: "حصر",
  INC: "ابتداء",
  EXL: "استثناء",
  AVR: "ردع",
  EXP: "تفسير",
  CAUS: "سببية",
  CERT: "توكيد",
  PRD: "جواب",
  ANS: "جواب",
  RSLT: "جواب شرط",
  SUP: "زائد",
  INT: "تفسير",
};

const FEATURE_LABELS: Record<string, string> = {
  NOM: "مرفوع",
  ACC: "منصوب",
  GEN: "مجرور",
  PERF: "ماضٍ",
  IMPF: "مضارع",
  IMPV: "أمر",
  IND: "مرفوع",
  SUBJ: "منصوب",
  JUS: "مجزوم",
  "MOOD:IND": "مرفوع",
  "MOOD:SUBJ": "منصوب",
  "MOOD:JUS": "مجزوم",
  ACT: "مبني للمعلوم",
  PASS: "مبني للمجهول",
  ACT_PCPL: "اسم فاعل",
  PASS_PCPL: "اسم مفعول",
  VN: "مصدر",
  ADJ: "صفة",
  M: "مذكر",
  F: "مؤنث",
  S: "مفرد",
  D: "مثنى",
  P: "جمع",
  MS: "مذكر مفرد",
  MD: "مذكر مثنى",
  MP: "مذكر جمع",
  FS: "مؤنث مفرد",
  FD: "مؤنث مثنى",
  FP: "مؤنث جمع",
  "1S": "متكلم مفرد",
  "1P": "متكلم جمع",
  "2MS": "مخاطب مذكر مفرد",
  "2FS": "مخاطب مؤنث مفرد",
  "2MP": "مخاطب مذكر جمع",
  "2FP": "مخاطب مؤنث جمع",
  "2D": "مخاطب مثنى",
  "3MS": "غائب مذكر مفرد",
  "3FS": "غائب مؤنث مفرد",
  "3MP": "غائب مذكر جمع",
  "3FP": "غائب مؤنث جمع",
  "3D": "غائب مثنى",
  SP: "اسم تفضيل",
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

export function labelPosCode(code: string): string {
  return TYPE_LABELS[code] || PARTICLE_LABELS[code] || "";
}

/** Ordered Arabic POS labels for display (content categories first). */
export function formatPosLabels(
  pos: string[] | undefined,
  features?: string[],
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
    let label = labelPosCode(code);
    if (!label) continue;
    if (code === "N" && hasPn) label = TYPE_LABELS.PN;
    if (seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels.join(" · ");
}

/** Human-readable Arabic feature chips — never show raw English codes. */
export function formatFeatureLabels(features: string[] | undefined): string {
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
    const label = FEATURE_LABELS[raw] || FEATURE_LABELS[raw.replace(/^MOOD:/, "")];
    if (!label || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels.join(" · ");
}
