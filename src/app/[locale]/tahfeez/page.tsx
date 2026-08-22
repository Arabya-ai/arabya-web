import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RECITERS } from "@/lib/audio";
import { loadTahfeezSession } from "@/lib/tahfeez/load-session";
import { TahfeezApp } from "@/components/tahfeez/TahfeezApp";
import { ArabyaHubHero, ArabyaHubPage } from "@/components/hub/ArabyaHubShell";
import "@/components/tahfeez/tahfeez.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Tahfeez" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function TahfeezPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const session = await loadTahfeezSession(locale, sp);
  const t = await getTranslations({ locale, namespace: "Tahfeez" });
  const th = await getTranslations({ locale, namespace: "ServicesHub" });

  const reciters = RECITERS.slice(0, 12).map((r) => ({
    id: r.id,
    name: locale === "en" ? r.nameEn : r.nameAr,
    folder: r.folder,
  }));

  return (
    <ArabyaHubPage className="tahfeez-hub-page">
      <ArabyaHubHero
        icon="tahfeez"
        iconLabel={t("metaTitle")}
        title={t("metaTitle")}
        lead={t("metaDescription")}
        nav={[
          { href: "/", label: th("backHome") },
          { href: "/reciters", label: th("items.reciters.title") },
          { href: "/services", label: th("viewAll") },
        ]}
      />
      <TahfeezApp
        locale={locale}
        initialSurahId={session.surahId}
        initialSurahName={session.surahName}
        initialAyahFrom={session.ayahFrom}
        initialAyahTo={session.ayahTo}
        initialAyahCount={session.ayahCount}
        initialVerses={session.verses}
        surahCatalog={session.catalog}
        reciters={reciters}
      />
    </ArabyaHubPage>
  );
}
