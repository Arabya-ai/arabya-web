/** Client-safe tahfeez helpers (no Node fs). */

export const TAHFEEZ_MAX_AYAHS = 20;

export type TahfeezVersePayload = {
  verseNumber: number;
  words: { text: string; position: number }[];
};

export type TahfeezSurahOption = {
  id: number;
  name: string;
  versesCount: number;
};

export function tahfeezHref(opts: {
  surah: number;
  from?: number;
  to?: number;
}): string {
  const q = new URLSearchParams();
  q.set("surah", String(opts.surah));
  if (opts.from) q.set("from", String(opts.from));
  if (opts.to) q.set("to", String(opts.to));
  return `/tahfeez?${q.toString()}`;
}
