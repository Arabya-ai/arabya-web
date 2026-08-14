import type { TahfeezWordResult, TahfeezWordStatus } from "./types";

/** All expected words have been evaluated (correct / wrong / skipped). */
export function isAyahRecitationComplete(
  cursor: number,
  totalWords: number,
): boolean {
  return totalWords > 0 && cursor >= totalWords;
}

export function freshWordResults(
  expectedWords: string[],
): TahfeezWordResult[] {
  return expectedWords.map((text, index) => ({
    index,
    text,
    status: "pending" as TahfeezWordStatus,
  }));
}

/**
 * Extract only new/changed speech segments from a Web Speech API result event.
 * Uses resultIndex so cumulative finals are not duplicated in the hypothesis.
 */
export function extractSpeechSegments(
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>,
  resultIndex = 0,
): { finalText: string; interimText: string; displayHint: string } {
  let finalText = "";
  let interimText = "";
  const start = Math.max(0, resultIndex);

  for (let i = start; i < results.length; i++) {
    const row = results[i];
    const chunk = row[0]?.transcript ?? "";
    if (row.isFinal) finalText += chunk;
    else interimText += chunk;
  }

  let displayHint = interimText.trim();
  if (!displayHint) {
    for (let i = results.length - 1; i >= 0; i--) {
      if (!results[i].isFinal) {
        displayHint = results[i][0]?.transcript ?? "";
        break;
      }
    }
  }
  if (!displayHint) displayHint = finalText.trim();

  return { finalText: finalText.trim(), interimText, displayHint: displayHint.trim() };
}
