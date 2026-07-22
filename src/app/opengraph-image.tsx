import { renderOgCard } from "@/lib/og-card";
import { OG_IMAGE_SIZE } from "@/lib/og-meta";

export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";
export const alt = "Arabya — Quran word study";

export default function OgImage() {
  return renderOgCard({
    title: "Arabya",
    subtitle: "Word-by-word Quran: meaning, grammar, tafsir",
    footer: "arabyaai.com",
  });
}
