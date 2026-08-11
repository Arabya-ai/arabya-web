import { renderOgCardLatin } from "@/lib/og-card";
import { ARABYA_SITE_HOST } from "@/lib/brand-export";
import { OG_IMAGE_SIZE } from "@/lib/og-meta";

export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";
export const alt = "عربية — تفسير كلمات القرآن";

export default function OgImage() {
  return renderOgCardLatin({
    title: "Arabya",
    subtitle: "Word-by-word Quran study",
    footer: ARABYA_SITE_HOST,
  });
}
