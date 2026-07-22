import { getRootEntry } from "@/lib/quran";
import { renderOgCardLatin } from "@/lib/og-card";
import { OG_IMAGE_SIZE } from "@/lib/og-meta";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";
export const alt = "عربية — جذر قرآني";

type Props = { params: Promise<{ root: string }> };

export default async function RootOgImage({ params }: Props) {
  const { root } = await params;
  const decoded = decodeURIComponent(root);
  let title = "Quranic root";
  let subtitle = "Occurrences in the Quran";

  try {
    const entry = await getRootEntry(decoded);
    if (entry) {
      title = `Root · ${entry.count} occurrences`;
      subtitle = "Browse lemmas and ayahs on Arabya";
    }
  } catch {
    /* defaults */
  }

  return renderOgCardLatin({
    eyebrow: "Roots",
    title,
    subtitle,
  });
}
