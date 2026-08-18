import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale-params";
import { QiblaCompass } from "@/components/QiblaCompass";
import { PrayerTimesCard } from "@/components/PrayerTimesCard";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Qibla" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function QiblaPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Qibla" });

  return (
    <div className="shell page-block qibla-page">
      <header className="adhkar-hero">
        <p className="adhkar-kicker">{t("kicker")}</p>
        <h1>{t("title")}</h1>
        <p>{t("lead")}</p>
        <div className="home-index-ornament" aria-hidden="true">
          <span className="home-index-ornament-mark" />
        </div>
      </header>

      <QiblaCompass />
      <PrayerTimesCard />
    </div>
  );
}
