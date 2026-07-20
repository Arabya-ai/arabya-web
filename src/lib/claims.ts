/** Claims model for multi-source analysis layers (ADR-0002). */

export type ClaimLayer =
  | "morphology"
  | "syntax"
  | "semantics"
  | "rhetoric"
  | "lexicon"
  | "translation";

export type AnalysisClaim = {
  id: string;
  layer: ClaimLayer;
  sourceId: string;
  sourceLabel: string;
  text: string;
  confidence?: "high" | "medium" | "low";
  license?: string;
  url?: string;
};

export type IrabSourceMeta = {
  id: string;
  label: string;
  /** ready = can show content; awaiting = catalog only */
  status: "ready" | "awaiting_license";
  license?: string;
  url?: string;
};

/** Built-in open source (always available). */
export const QAC_IRAB_SOURCE: IrabSourceMeta = {
  id: "qac",
  label: "المدونة القرآنية العربية (QAC)",
  status: "ready",
  license: "GNU GPL",
  url: "http://corpus.quran.com",
};

export function listIrabSources(
  bookCatalog: IrabSourceMeta[] = [],
): IrabSourceMeta[] {
  return [QAC_IRAB_SOURCE, ...bookCatalog];
}

export function claimFromQacIrab(
  wordId: string,
  text: string,
): AnalysisClaim {
  return {
    id: `claim:${wordId}:syntax:qac`,
    layer: "syntax",
    sourceId: QAC_IRAB_SOURCE.id,
    sourceLabel: QAC_IRAB_SOURCE.label,
    text,
    confidence: "high",
    license: QAC_IRAB_SOURCE.license,
    url: QAC_IRAB_SOURCE.url,
  };
}
