import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arabya / عربية — Quran word study",
    short_name: "Arabya",
    description:
      "Madinah mushaf with word-level meaning, iʿrāb, and tafsirs — مصحف المدينة ودراسة الكلمات",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f7f5",
    theme_color: "#0f766e",
    lang: "ar",
    dir: "rtl",
    icons: [
      {
        src: "/brand/favicon-32.png",
        sizes: "32x32",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/arabya-mark-square.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/arabya-mark-square.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
