import type { MetadataRoute } from "next";
import { getLibraryCatalog } from "@/lib/library";
import { getMushafIndex } from "@/lib/mushaf";
import { getSurahs } from "@/lib/quran";

const base = "https://www.arabya.org";

/** Full sitemap: home, tools, all 604 mushaf pages, surah read pages */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [index, surahs, libraryWorks] = await Promise.all([
    getMushafIndex(),
    getSurahs(),
    getLibraryCatalog(),
  ]);
  const total = index.totalPages || 604;

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/juz`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/reciters`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/roots`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/study`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/asma`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/resources`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/library`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/adhkar`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/adhkar/duas`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/adhkar/tasbeeh`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/qibla`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/lughawi`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/lughawi/features`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/lughawi/mistakes`, changeFrequency: "monthly", priority: 0.5 },
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

  const libraryPages: MetadataRoute.Sitemap = libraryWorks.map((w) => ({
    url: `${base}/library/${w.id}`,
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }));

  return [...staticPages, ...libraryPages, ...mushafPages, ...surahReads];
}
