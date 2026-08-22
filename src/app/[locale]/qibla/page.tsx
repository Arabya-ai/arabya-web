import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale-params";
import { QiblaCompass } from "@/components/QiblaCompass";
import { PrayerTimesCard } from "@/components/PrayerTimesCard";
import { HijriEventsPanel } from "@/components/HijriEventsPanel";
import { listHijriEvents } from "@/lib/hijri-events";
import { ArabyaHubHero, ArabyaHubPage } from "@/components/hub/ArabyaHubShell";

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
  const th = await getTranslations({ locale, namespace: "ServicesHub" });
  const events = await listHijriEvents();

  return (
    <ArabyaHubPage className="qibla-page">
      <ArabyaHubHero
        icon="qibla"
        iconLabel={t("title")}
        kicker={t("kicker")}
        title={t("title")}
        lead={t("lead")}
        nav={[
          { href: "/", label: th("backHome") },
          { href: "/adhkar", label: th("items.adhkar.title") },
          { href: "/services", label: th("viewAll") },
        ]}
      />

      <QiblaCompass />
      <PrayerTimesCard />
      <HijriEventsPanel events={events} />
    </ArabyaHubPage>
  );
}
