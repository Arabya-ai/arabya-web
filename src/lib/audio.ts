/** EveryAyah.com CDN — Mishary Alafasy 128kbps (public streaming). */

export function ayahAudioUrl(surahId: number, verse: number): string {
  const s = String(surahId).padStart(3, "0");
  const v = String(verse).padStart(3, "0");
  return `https://everyayah.com/data/Alafasy_128kbps/${s}${v}.mp3`;
}
