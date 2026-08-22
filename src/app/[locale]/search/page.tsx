import "@/components/services/services-hub.css";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale-params";
import { getSurahs } from "@/lib/quran";
import { AdvancedQuranSearch } from "@/components/search/AdvancedQuranSearch";
import { ArabyaHubHero, ArabyaHubPage } from "@/components/hub/ArabyaHubShell";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdvancedSearch" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function AdvancedSearchPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "AdvancedSearch" });
  const th = await getTranslations({ locale, namespace: "ServicesHub" });
  const surahs = await getSurahs();

  return (
    <ArabyaHubPage className="adv-search-page">
      <ArabyaHubHero
        icon="search"
        iconLabel={t("title")}
        title={t("title")}
        lead={t("lead")}
        nav={[
          { href: "/services", label: th("viewAll") },
          { href: "/", label: th("backHome") },
          { href: "/study", label: th("items.study.title") },
        ]}
      />
      <AdvancedQuranSearch surahs={surahs} />
    </ArabyaHubPage>
  );
}
