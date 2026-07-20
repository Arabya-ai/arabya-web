import type { MetadataRoute } from "next";
import { getMushafIndex } from "@/lib/mushaf";
import { getSurahs } from "@/lib/quran";

const base = "https://www.arabyaai.com";

/** Full sitemap: home, tools, all 604 mushaf pages, surah read pages */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [index, surahs] = await Promise.all([getMushafIndex(), getSurahs()]);
  const total = index.totalPages || 604;

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/juz`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/books`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/resources`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/qiraat`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/hadith`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/heritage`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const mushafPages: MetadataRoute.Sitemap = Array.from(
    { length: total },
    (_, i) => ({
      url: `${base}/mushaf/${i + 1}`,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    }),
  );

  const surahReads: MetadataRoute.Sitemap = surahs.map((s) => ({
    url: `${base}/surah/${s.id}/read`,
    changeFrequency: "yearly" as const,
    priority: 0.65,
  }));

  return [...staticPages, ...mushafPages, ...surahReads];
}
