import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale-params";
import { getHisnCategories } from "@/lib/adhkar";
import { AdhkarLocalNav } from "@/components/AdhkarLocalNav";
import { HisnExplorer } from "@/components/HisnExplorer";
import { ArabyaHubHero, ArabyaHubPage } from "@/components/hub/ArabyaHubShell";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Adhkar" });
  return {
    title: t("hisnMetaTitle"),
    description: t("hisnMetaDescription"),
  };
}

export default async function HisnPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Adhkar" });
  const th = await getTranslations({ locale, namespace: "ServicesHub" });
  const categories = await getHisnCategories();

  return (
    <ArabyaHubPage className="adhkar-page">
      <AdhkarLocalNav locale={locale} current="hisn" />
      <ArabyaHubHero
        icon="books"
        iconLabel={t("tools.hisn")}
        title={t("tools.hisn")}
        lead={t("tools.hisnDesc")}
        nav={[
          { href: "/adhkar", label: th("items.adhkar.title") },
          { href: "/", label: th("backHome") },
        ]}
      />
      <HisnExplorer categories={categories} />
    </ArabyaHubPage>
  );
}
