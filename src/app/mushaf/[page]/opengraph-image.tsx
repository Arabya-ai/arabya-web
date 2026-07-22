import { getMushafPage } from "@/lib/mushaf";
import { renderOgCardLatin } from "@/lib/og-card";
import { OG_IMAGE_SIZE } from "@/lib/og-meta";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";
export const alt = "عربية — صفحة المصحف";

type Props = { params: Promise<{ page: string }> };

export default async function OgImage({ params }: Props) {
  const { page } = await params;
  const pageNum = Number(page);
  let title = `Mushaf page ${page}`;
  let subtitle = "Madinah Mushaf · Arabya";

  if (Number.isInteger(pageNum) && pageNum >= 1 && pageNum <= 604) {
    try {
      const content = await getMushafPage(pageNum);
      if (content) {
        const ids = [...new Set(content.blocks.map((b) => b.surahId))];
        title = `Page ${pageNum}`;
        subtitle =
          ids.length === 1 ? `Surah ${ids[0]}` : `Surahs ${ids.join(", ")}`;
      }
    } catch {
      /* defaults */
    }
  }

  return renderOgCardLatin({
    eyebrow: "Madinah Mushaf",
    title,
    subtitle,
  });
}
