/** Canonical word ID: W:SSS:VVV:PPP (surah:verse:position, zero-padded). */

export function makeWordId(
  surahId: number,
  verse: number,
  position: number,
): string {
  return `W:${pad3(surahId)}:${pad3(verse)}:${pad3(position)}`;
}

export function parseWordId(
  wordId: string,
): { surahId: number; verse: number; position: number } | null {
  const m = /^W:(\d{3}):(\d{3}):(\d{3})$/.exec(wordId.trim());
  if (!m) return null;
  return {
    surahId: Number(m[1]),
    verse: Number(m[2]),
    position: Number(m[3]),
  };
}

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}
