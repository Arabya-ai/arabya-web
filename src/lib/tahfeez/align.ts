import {
  normalizeArabicToken,
  tokenizeExpected,
  tokenizeHypothesis,
} from "./normalize";
import type { TahfeezWordResult, TahfeezWordStatus } from "./types";

/**
 * Sequential constrained alignment: advance expected pointer when the next
 * hypothesized token matches; mark wrong on mismatch; skip remaining as pending.
 */
export function alignRecitation(
  expectedWords: string[],
  hypothesisText: string,
  opts?: { cursor?: number },
): {
  results: TahfeezWordResult[];
  cursor: number;
  accuracy: number;
  matchedThisPass: number;
} {
  const expected = tokenizeExpected(expectedWords);
  const hypo = tokenizeHypothesis(hypothesisText);
  const cursor0 = Math.max(0, Math.min(opts?.cursor ?? 0, expected.length));

  const status: TahfeezWordStatus[] = expected.map((_, i) =>
    i < cursor0 ? "correct" : "pending",
  );

  let cursor = cursor0;
  let matchedThisPass = 0;
  let hypoIdx = 0;

  while (hypoIdx < hypo.length && cursor < expected.length) {
    const want = expected[cursor];
    const got = hypo[hypoIdx];
    if (got === want) {
      status[cursor] = "correct";
      cursor += 1;
      matchedThisPass += 1;
      hypoIdx += 1;
      continue;
    }
    // Lookahead: skip one expected if next matches (user skipped a word)
    if (
      cursor + 1 < expected.length &&
      hypo[hypoIdx] === expected[cursor + 1]
    ) {
      status[cursor] = "skipped";
      cursor += 1;
      continue;
    }
    // Lookahead: ignore filler hypo token if next hypo matches current expected
    if (
      hypoIdx + 1 < hypo.length &&
      hypo[hypoIdx + 1] === want
    ) {
      hypoIdx += 1;
      continue;
    }
    status[cursor] = "wrong";
    cursor += 1;
    hypoIdx += 1;
  }

  const results: TahfeezWordResult[] = expectedWords.map((text, index) => ({
    index,
    text,
    status: status[index] ?? "pending",
  }));

  const decided = results.filter((r) => r.status !== "pending");
  const correct = decided.filter((r) => r.status === "correct").length;
  const accuracy =
    decided.length === 0 ? 0 : Math.round((correct / decided.length) * 100);

  return { results, cursor, accuracy, matchedThisPass };
}

export function wordsEqual(a: string, b: string): boolean {
  return normalizeArabicToken(a) === normalizeArabicToken(b);
}
