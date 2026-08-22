import {
  getActiveLearnedPairs,
  isPairSuppressed,
} from "@/lib/lughawi/learning-store";
import { BUILTIN_SPELLING } from "@/lib/lughawi/rules/spelling-data";
import {
  ALEF_FARQ_RE,
  collectNameAliEdits,
  nextSpellingId,
  spellingWordEdit,
  spellingWordRe,
  type SpellingLocale,
} from "@/lib/lughawi/rules/spelling-helpers";
import type { LughawiEdit } from "@/lib/lughawi/types";

export { BUILTIN_SPELLING } from "@/lib/lughawi/rules/spelling-data";
export { collectSpellingEditsOffline } from "@/lib/lughawi/rules/spelling-offline";

type Locale = SpellingLocale;

export function collectSpellingEdits(
  text: string,
  locale: Locale = "ar",
): LughawiEdit[] {
  const edits: LughawiEdit[] = [];
  let seq = 0;

  const expandedBuiltin = BUILTIN_SPELLING.filter(
    (p) => p.from !== p.to && (p.confidence ?? 1) > 0,
  ).flatMap((p) => {
    const rows = [{ ...p, learned: false as const }];
    const skipAl =
      p.ruleId === "ya-preposition" ||
      p.ruleId === "ila-preposition" ||
      p.ruleId === "name-ali" ||
      p.from.length <= 2;
    if (!skipAl && !p.from.startsWith("ال") && !p.to.startsWith("ال")) {
      rows.push({
        ...p,
        from: `ال${p.from}`,
        to: `ال${p.to}`,
        confidence: Math.min(0.92, (p.confidence ?? 0.9) + 0.02),
        learned: false as const,
      });
    }
    return rows;
  });

  const pairs = [
    ...getActiveLearnedPairs().map((p) => ({
      from: p.from,
      to: p.to,
      ruleId: p.ruleId ?? "learned",
      confidence: p.confidence,
      learned: true as const,
    })),
    ...expandedBuiltin,
  ];

  pairs.sort((a, b) => b.from.length - a.from.length);

  const claimed = new Set<string>();

  for (const rule of pairs) {
    if (isPairSuppressed(rule.from, rule.to)) continue;
    const re = spellingWordRe(rule.from);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0]!.length;
      const key = `${start}:${end}`;
      if (claimed.has(key)) continue;
      if (m[0] === rule.to) continue;
      claimed.add(key);
      seq += 1;
      edits.push(
        spellingWordEdit(
          text,
          start,
          end,
          rule.to,
          rule.ruleId,
          locale,
          nextSpellingId(rule.learned ? "ln" : "sp", seq),
          rule.confidence ?? 0.9,
        ),
      );
    }
  }

  ALEF_FARQ_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ALEF_FARQ_RE.exec(text)) !== null) {
    const stem = m[1]!;
    if (stem.endsWith("وا") || stem.length < 3) continue;
    if (/^(هو|ذو|أبو|بنو)$/.test(stem)) continue;
    const start = m.index;
    const end = start + stem.length;
    const key = `${start}:${end}`;
    if (claimed.has(key)) continue;
    if (isPairSuppressed(stem, `${stem}ا`)) continue;
    claimed.add(key);
    seq += 1;
    edits.push(
      spellingWordEdit(
        text,
        start,
        end,
        `${stem}ا`,
        "alef-farq",
        locale,
        nextSpellingId("sp", seq),
        0.55,
      ),
    );
  }

  const spaceRe = / {2,}/g;
  let sm: RegExpExecArray | null;
  while ((sm = spaceRe.exec(text)) !== null) {
    seq += 1;
    edits.push(
      spellingWordEdit(
        text,
        sm.index,
        sm.index + sm[0]!.length,
        " ",
        "double-space",
        locale,
        nextSpellingId("sp", seq),
        0.95,
      ),
    );
  }

  const nameAli = collectNameAliEdits(
    text,
    locale,
    claimed,
    seq,
    isPairSuppressed,
  );
  edits.push(...nameAli.edits);
  seq = nameAli.nextSeq;

  return edits.sort((a, b) => a.start - b.start || b.end - a.end);
}
