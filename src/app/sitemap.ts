import type { MetadataRoute } from "next";
import { getMushafIndex } from "@/lib/mushaf";

const base = "https://arabyaai.com";

/** Keep sitemap lean: home + key pages + first page of each surah */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const index = await getMushafIndex();
  const surahPages = Object.values(index.surahFirstPage ?? {}).map(Number);

  const uniquePages = [...new Set(surahPages.filter((n) => n >= 1 && n <= 604))];

  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...uniquePages.map((page) => ({
      url: `${base}/mushaf/${page}`,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
  ];
}
