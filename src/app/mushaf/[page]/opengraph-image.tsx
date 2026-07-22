import { getMushafPage } from "@/lib/mushaf";
import { renderOgCard } from "@/lib/og-card";
import { OG_IMAGE_SIZE } from "@/lib/og-meta";

export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";
export const alt = "Arabya — Mushaf page";

type Props = { params: Promise<{ page: string }> };

export default async function OgImage({ params }: Props) {
  const { page } = await params;
  const pageNum = Number(page);
  let title = `Mushaf page ${page}`;
  let subtitle = "Madinah Mushaf · word study on Arabya";

  if (Number.isInteger(pageNum) && pageNum >= 1 && pageNum <= 604) {
    try {
      const content = await getMushafPage(pageNum);
      if (content) {
        const surahIds = [...new Set(content.blocks.map((b) => b.surahId))];
        title = `Mushaf · page ${pageNum}`;
        subtitle =
          surahIds.length === 1
            ? `Surah ${surahIds[0]} · Arabya`
            : `Surahs ${surahIds.join(", ")} · Arabya`;
      }
    } catch {
      /* defaults */
    }
  }

  return renderOgCard({
    eyebrow: "Madinah Mushaf",
    title,
    subtitle,
  });
}
