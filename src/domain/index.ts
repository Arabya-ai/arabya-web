/**
 * Framework-free domain surface for Quran word study.
 * Prefer importing from here in new code (Flutter/shared clients later).
 * Implementations stay in `src/lib/*` for now.
 */

export { makeWordId, parseWordId } from "@/lib/word-id";
export {
  formatFeatureLabels,
  formatPosLabels,
  labelPosCode,
} from "@/lib/morph-labels";
export {
  claimFromQacIrab,
  type AnalysisClaim,
  type ClaimLayer,
  type IrabSourceMeta,
} from "@/lib/claims";
export type {
  IrabWord,
  QuranWord,
  TafsirSource,
  VerseTranslationEdition,
} from "@/lib/types";
