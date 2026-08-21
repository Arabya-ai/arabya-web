import {
  normalizeArabicToken,
  tokenizeHypothesis,
} from "./normalize";
import type { TahfeezWordResult, TahfeezWordStatus } from "./types";

/**
 * Sequential constrained alignment: advance expected pointer when the next
 * hypothesized token matches; mark wrong on mismatch; skip remaining as pending.
 *
 * Statuses are always indexed against the original `expectedWords` array
 * (empty normalized tokens stay `pending` and do not consume hypothesis).
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
  const expectedTokens = expectedWords.map((w) => normalizeArabicToken(w));
  const activeIndexes = expectedTokens
    .map((token, index) => (token ? index : -1))
    .filter((i) => i >= 0);
  const hypo = tokenizeHypothesis(hypothesisText);

  const status: TahfeezWordStatus[] = expectedWords.map(() => "pending");

  const activePos0 = Math.max(
    0,
    Math.min(opts?.cursor ?? 0, activeIndexes.length),
  );
  for (let i = 0; i < activePos0; i++) {
    status[activeIndexes[i]] = "correct";
  }

  let activePos = activePos0;
  let matchedThisPass = 0;
  let hypoIdx = 0;

  while (hypoIdx < hypo.length && activePos < activeIndexes.length) {
    const wordIndex = activeIndexes[activePos];
    const want = expectedTokens[wordIndex];
    const got = hypo[hypoIdx];

    if (got === want) {
      status[wordIndex] = "correct";
      activePos += 1;
      matchedThisPass += 1;
      hypoIdx += 1;
      continue;
    }

    // Lookahead: skip one expected if next matches (user skipped a word)
    if (activePos + 1 < activeIndexes.length) {
      const nextIndex = activeIndexes[activePos + 1];
      if (hypo[hypoIdx] === expectedTokens[nextIndex]) {
        status[wordIndex] = "skipped";
        activePos += 1;
        continue;
      }
    }

    // Lookahead: ignore filler hypo token if next hypo matches current expected
    if (hypoIdx + 1 < hypo.length && hypo[hypoIdx + 1] === want) {
      hypoIdx += 1;
      continue;
    }

    status[wordIndex] = "wrong";
    activePos += 1;
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

  return {
    results,
    cursor: activePos,
    accuracy,
    matchedThisPass,
  };
}

export function wordsEqual(a: string, b: string): boolean {
  return normalizeArabicToken(a) === normalizeArabicToken(b);
}
