import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSurah } from "@/lib/quran";
import { getSurahDisplayName } from "@/lib/surah-names";
import { RECITERS } from "@/lib/audio";
import { TahfeezApp } from "@/components/tahfeez/TahfeezApp";
import "@/components/tahfeez/tahfeez.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Tahfeez" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function TahfeezPage({ params }: Props) {
  const { locale } = await params;
  const surah = await getSurah(1);
  const verses =
    surah?.verses.map((v) => ({
      verseNumber: v.verseNumber,
      words: v.words
        .filter((w) => w.charType !== "end")
        .map((w) => ({ text: w.text, position: w.position })),
    })) ?? [];

  const reciters = RECITERS.slice(0, 12).map((r) => ({
    id: r.id,
    name: locale === "en" ? r.nameEn : r.nameAr,
    folder: r.folder,
  }));

  return (
    <TahfeezApp
      locale={locale}
      initialSurahId={1}
      initialSurahName={getSurahDisplayName(1, locale === "en" ? "en" : "ar")}
      initialVerses={verses}
      reciters={reciters}
    />
  );
}
