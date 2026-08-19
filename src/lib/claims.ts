/** Claims model for multi-source analysis layers (ADR-0002). */

export type ClaimLayer =
  | "morphology"
  | "syntax"
  | "semantics"
  | "rhetoric"
  | "lexicon"
  | "translation";

export type IrabClaimScope = "word" | "ayah";

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

/** Word- or ayah-level iʿrāb claim with provenance (ADR-0002). */
export type IrabClaim = AnalysisClaim & {
  scope: IrabClaimScope;
  wordId?: string;
  verseKey?: string;
  evidence?: string;
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
  evidence?: string,
): IrabClaim {
  return {
    id: `claim:${wordId}:syntax:qac`,
    layer: "syntax",
    sourceId: QAC_IRAB_SOURCE.id,
    sourceLabel: QAC_IRAB_SOURCE.label,
    text,
    scope: "word",
    wordId,
    evidence,
    confidence: "high",
    license: QAC_IRAB_SOURCE.license,
    url: QAC_IRAB_SOURCE.url,
  };
}

/** True when multiple claims carry meaningfully different text. */
export function claimsHaveAlternates(claims: IrabClaim[]): boolean {
  const texts = new Set(
    claims.map((c) => c.text.trim()).filter((t) => t && t !== "—"),
  );
  return texts.size > 1;
}
