import type { MetadataRoute } from "next";
import { getLibraryCatalog } from "@/lib/library";
import { getMushafIndex } from "@/lib/mushaf";
import { getSurahs } from "@/lib/quran";
import { listHadithCollections } from "@/lib/hadith";
import { listHeritageWorks } from "@/lib/heritage";

const base = "https://www.arabya.org";

/** Full sitemap: home, tools, mushaf, library, hadith collections, heritage */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [index, surahs, libraryWorks, hadithCollections, heritageWorks] =
    await Promise.all([
      getMushafIndex(),
      getSurahs(),
      getLibraryCatalog(),
      listHadithCollections(),
      listHeritageWorks(),
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
    { url: `${base}/services`, changeFrequency: "weekly", priority: 0.75 },
    { url: `${base}/resources`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/books`, changeFrequency: "monthly", priority: 0.55 },
    { url: `${base}/library`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/adhkar`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/adhkar/duas`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/adhkar/hisn`, changeFrequency: "monthly", priority: 0.55 },
    { url: `${base}/adhkar/tasbeeh`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/qibla`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/tahfeez`, changeFrequency: "monthly", priority: 0.55 },
    { url: `${base}/studio`, changeFrequency: "monthly", priority: 0.55 },
    { url: `${base}/lughawi`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/lughawi/features`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/lughawi/mistakes`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/hadith`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/heritage`, changeFrequency: "weekly", priority: 0.65 },
    { url: `${base}/qiraat`, changeFrequency: "monthly", priority: 0.5 },
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

  const hadithPages: MetadataRoute.Sitemap = hadithCollections.map((c) => ({
    url: `${base}/hadith/${c.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }));

  const heritagePages: MetadataRoute.Sitemap = heritageWorks.map((w) => ({
    url: `${base}/heritage/${w.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...libraryPages,
    ...hadithPages,
    ...heritagePages,
    ...mushafPages,
    ...surahReads,
  ];
}
