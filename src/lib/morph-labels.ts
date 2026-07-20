/** Arabic labels for Quranic Arabic Corpus POS / particle tags. */
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
  return TYPE_LABELS[code] || PARTICLE_LABELS[code] || code;
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
    if (code === "N" && hasPn) label = TYPE_LABELS.PN;
    if (seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels.join(" · ");
}
