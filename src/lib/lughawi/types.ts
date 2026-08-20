/** Shared types for لغوي proofreader pipeline and API contracts. */

export type LughawiMode = "proofread" | "rewrite" | "tashkeel" | "translate" | "tafqeet";

export type TashkeelLevel = "full" | "partial" | "endings" | "mandatory";

export type RewriteStyle = "fusha" | "clearer" | "shorter";

export type EditType =
  | "spelling"
  | "grammar"
  | "morphology"
  | "punctuation"
  | "style"
  | "tashkeel"
  | "other";

export type EditSource = "rules" | "camel" | "gec" | "ai" | "tashkeel" | "punctuation";

export type EditStatus = "proposed" | "accepted" | "rejected";

export type AiProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "openrouter";

export interface LughawiEdit {
  id: string;
  start: number;
  end: number;
  type: EditType;
  original: string;
  suggestion: string;
  ruleId?: string;
  explanation: string;
  confidence: number;
  source: EditSource;
  status: EditStatus;
}

export interface ProtectedSpan {
  start: number;
  end: number;
  reason: "quran" | "user_lock";
  surah?: number;
  ayah?: number;
  href?: string;
}

export interface EngineStageTrace {
  id: string;
  editCount: number;
  ms: number;
  note?: string;
}

export interface ProofreadMeta {
  engine: string;
  usedAi: boolean;
  quotaCharged: number;
  provider?: string;
  warning?: string;
  offline?: boolean;
  /** Semver of the local engine core. */
  version?: string;
  /** Per-stage inference trace (rules / future GEC / AI). */
  stages?: EngineStageTrace[];
  totalMs?: number;
}

export interface ProofreadResponse {
  original: string;
  result: string;
  edits: LughawiEdit[];
  protectedSpans: ProtectedSpan[];
  meta: ProofreadMeta;
}

export interface ProofreadOptions {
  mode?: LughawiMode;
  locale?: "ar" | "en";
  tashkeelLevel?: TashkeelLevel;
  rewriteStyle?: RewriteStyle;
  targetLang?: string;
  useAi?: boolean;
  /** Drop suggestions below this confidence (default 0.5 in engine). */
  minConfidence?: number;
}

export const AI_PROVIDERS: {
  id: AiProviderId;
  label: string;
  labelAr: string;
}[] = [
  { id: "openai", label: "OpenAI", labelAr: "OpenAI" },
  { id: "anthropic", label: "Anthropic", labelAr: "Anthropic" },
  { id: "google", label: "Google Gemini", labelAr: "Google Gemini" },
  { id: "groq", label: "Groq", labelAr: "Groq" },
  { id: "openrouter", label: "OpenRouter", labelAr: "OpenRouter" },
];
