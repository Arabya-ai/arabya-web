import { getRootEntry } from "@/lib/quran";
import { renderOgCard } from "@/lib/og-card";
import { OG_IMAGE_SIZE } from "@/lib/og-meta";

export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";
export const alt = "Arabya — Quranic root";

type Props = { params: Promise<{ root: string }> };

export default async function RootOgImage({ params }: Props) {
  const { root } = await params;
  const decoded = decodeURIComponent(root);
  let title = "Quranic root";
  let subtitle = "Occurrences in the Quran · Arabya";

  try {
    const entry = await getRootEntry(decoded);
    if (entry) {
      // Avoid Arabic glyphs in ImageResponse (satori CI crash); show count only.
      title = `Root · ${entry.count} occurrences`;
      subtitle = "Browse lemmas and ayah locations on Arabya";
    }
  } catch {
    /* defaults */
  }

  return renderOgCard({
    eyebrow: "Roots index",
    title,
    subtitle,
  });
}
