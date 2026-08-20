/** Client-safe stage metadata — no Node/fs imports. */

export const LUGHAWI_ENGINE_VERSION = "1.3.0";

export type EngineStageId =
  | "guard"
  | "spelling"
  | "grammar"
  | "style"
  | "punctuation"
  | "merge"
  | "rank";

export interface EngineStageMeta {
  id: EngineStageId;
  labelAr: string;
  labelEn: string;
}

/** Ordered stage labels for UI + status API (runners live in core.ts only). */
export const ENGINE_STAGE_META: EngineStageMeta[] = [
  {
    id: "guard",
    labelAr: "حماية النص القرآني",
    labelEn: "Quran guard",
  },
  {
    id: "grammar",
    labelAr: "نحو واتفاق",
    labelEn: "Grammar & agreement",
  },
  {
    id: "spelling",
    labelAr: "إملاء ومعجم",
    labelEn: "Spelling & lexicon",
  },
  {
    id: "style",
    labelAr: "أسلوب وتنسيق",
    labelEn: "Style & spacing",
  },
  {
    id: "punctuation",
    labelAr: "ترقيم",
    labelEn: "Punctuation",
  },
  {
    id: "merge",
    labelAr: "دمج التعارضات",
    labelEn: "Conflict merge",
  },
  {
    id: "rank",
    labelAr: "ترتيب الثقة",
    labelEn: "Confidence rank",
  },
];

export function stageLabelAr(id: string): string {
  return ENGINE_STAGE_META.find((s) => s.id === id)?.labelAr ?? id;
}
