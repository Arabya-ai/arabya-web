import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale-params";
import tajweedLegend from "../../../../data/qiraat/tajweed-legend.json";
import tajweedSamples from "../../../../data/tajweed/samples.json";
import {
  TajweedService,
  type TajweedRule,
  type TajweedSample,
} from "@/components/tajweed/TajweedService";
import { ArabyaHubHero, ArabyaHubPage } from "@/components/hub/ArabyaHubShell";

type Props = { params: Promise<{ locale: string }> };

const rules = (tajweedLegend.rules ?? []) as TajweedRule[];
const samples = (tajweedSamples.samples ?? []) as TajweedSample[];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "TajweedService" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function TajweedPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "TajweedService" });
  const th = await getTranslations({ locale, namespace: "ServicesHub" });

  return (
    <ArabyaHubPage className="tajweed-svc-page">
      <ArabyaHubHero
        icon="tajweed"
        iconLabel={t("title")}
        title={t("title")}
        lead={t("lead")}
        nav={[
          { href: "/services", label: th("viewAll") },
          { href: "/qiraat", label: th("items.qiraat.title") },
          { href: "/", label: th("backHome") },
        ]}
      />
      <TajweedService rules={rules} samples={samples} />
    </ArabyaHubPage>
  );
}
