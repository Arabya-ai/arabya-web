import { getSurahMeta } from "@/lib/quran";
import { renderOgCardLatin } from "@/lib/og-card";
import { OG_IMAGE_SIZE } from "@/lib/og-meta";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";
export const alt = "عربية — إعراب آية";

type Props = { params: Promise<{ surah: string; verse: string }> };

export default async function AyahOgImage({ params }: Props) {
  const { surah, verse } = await params;
  const surahId = Number(surah);
  const verseNumber = Number(verse);
  let title = "Ayah iʿrāb";
  let subtitle = "Word-by-word grammar · Arabya";

  if (
    Number.isInteger(surahId) &&
    Number.isInteger(verseNumber) &&
    surahId >= 1 &&
    surahId <= 114
  ) {
    title = `Surah ${surahId} · ayah ${verseNumber}`;
    try {
      const meta = await getSurahMeta(surahId);
      if (meta?.nameSimple) {
        subtitle = `${meta.nameSimple} ${verseNumber} · iʿrāb`;
      }
    } catch {
      /* defaults */
    }
  }

  return renderOgCardLatin({
    eyebrow: "Iʿrāb",
    title,
    subtitle,
  });
}
