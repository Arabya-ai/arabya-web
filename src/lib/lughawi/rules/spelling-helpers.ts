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

/**
 * Verbs / cues after which «على» is usually the name علي (yaa), not the preposition.
 * Includes ساعد so «احمد ساعد على…» becomes «… علي…».
 */
export const NAME_ALI_TRIGGERS =
  "قابل|قابلت|قابله|زرت|زار|رأيت|رأى|لقيت|لَقيت|كلمت|كلّمت|ناديت|نادى|سميت|سمّيت|اسمه|يدعى|يُدعى|ساعد|ساعدت|ساعده|ساعدها|ساعدهم|ساعدتنا|مع|إلى|الى";

const NAME_ALI_RE = new RegExp(
  `(?<![\\u0600-\\u06FFa-zA-Z0-9])(${NAME_ALI_TRIGGERS})\\s+على(?![\\u0600-\\u06FFa-zA-Z0-9])`,
  "g",
);

/** Context rule: على → علي after meeting / helping / naming cues. */
export function collectNameAliEdits(
  text: string,
  locale: SpellingLocale,
  claimed: Set<string>,
  seq: number,
  isSuppressed: (from: string, to: string) => boolean = () => false,
): { edits: LughawiEdit[]; nextSeq: number } {
  const edits: LughawiEdit[] = [];
  let nextSeq = seq;
  NAME_ALI_RE.lastIndex = 0;
  let nm: RegExpExecArray | null;
  while ((nm = NAME_ALI_RE.exec(text)) !== null) {
    const full = nm[0]!;
    const start = nm.index + full.lastIndexOf("على");
    const end = start + "على".length;
    const key = `${start}:${end}`;
    if (claimed.has(key)) continue;
    if (isSuppressed("على", "علي")) continue;
    claimed.add(key);
    nextSeq += 1;
    edits.push(
      spellingWordEdit(
        text,
        start,
        end,
        "علي",
        "name-ali",
        locale,
        nextSpellingId("sp", nextSeq),
        0.9,
      ),
    );
  }
  return { edits, nextSeq };
}
