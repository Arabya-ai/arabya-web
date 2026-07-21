import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "عربية — تفسير كلمات القرآن",
    short_name: "عربية",
    description: "مصحف المدينة مع دراسة كل كلمة: معنى، إعراب، وتفاسير",
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
