import { explainRule } from "@/lib/lughawi/rules/notes";
import type { LughawiEdit } from "@/lib/lughawi/types";

export type SpellingLocale = "ar" | "en";

export function nextSpellingId(prefix: string, n: number): string {
  return `${prefix}-${n}`;
}

/** Word boundary: not Arabic/Latin/digit on either side. */
export function spellingWordRe(word: string): RegExp {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\u0600-\\u06FFa-zA-Z0-9])${esc}(?![\\u0600-\\u06FFa-zA-Z0-9])`, "g");
}

export function spellingWordEdit(
  text: string,
  start: number,
  end: number,
  suggestion: string,
  ruleId: string,
  locale: SpellingLocale,
  id: string,
  confidence = 0.9,
  source: LughawiEdit["source"] = "rules",
): LughawiEdit {
  return {
    id,
    start,
    end,
    type: "spelling",
    original: text.slice(start, end),
    suggestion,
    ruleId,
    explanation:
      ruleId === "learned"
        ? locale === "en"
          ? "Learned from user accept/reject feedback."
          : "تصحيح مستفاد من قبول/رفض المستخدمين."
        : explainRule(ruleId, locale),
    confidence,
    source,
    status: "proposed",
  };
}

export const ALEF_FARQ_RE =
  /(?<![\u0600-\u06FFa-zA-Z0-9])([\u0621-\u064A]{2,14}و)(?=[\s.,،؛؟!)]|$)/g;
