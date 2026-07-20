/** Audio helpers — verse (EveryAyah) + word-by-word (Quran CDN). */

export function ayahAudioUrl(surahId: number, verse: number): string {
  const s = String(surahId).padStart(3, "0");
  const v = String(verse).padStart(3, "0");
  return `https://everyayah.com/data/Alafasy_128kbps/${s}${v}.mp3`;
}

/** Per-word clip from Quran.com CDN (path from API word.audio_url). */
export function wordAudioUrl(
  surahId: number,
  verse: number,
  position: number,
): string {
  const s = String(surahId).padStart(3, "0");
  const v = String(verse).padStart(3, "0");
  const w = String(position).padStart(3, "0");
  return `https://audio.qurancdn.com/wbw/${s}_${v}_${w}.mp3`;
}
