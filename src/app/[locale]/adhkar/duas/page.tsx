import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale-params";
import { getDuas } from "@/lib/adhkar";
import { AdhkarLocalNav } from "@/components/AdhkarLocalNav";
import { DuasExplorer } from "@/components/DuasExplorer";
import { ArabyaHubHero, ArabyaHubPage } from "@/components/hub/ArabyaHubShell";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Adhkar" });
  return {
    title: t("duasMetaTitle"),
    description: t("duasMetaDescription"),
  };
}

export default async function DuasPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Adhkar" });
  const th = await getTranslations({ locale, namespace: "ServicesHub" });
  const duas = await getDuas();

  return (
    <ArabyaHubPage className="adhkar-page">
      <AdhkarLocalNav locale={locale} current="duas" />
      <ArabyaHubHero
        icon="adhkar"
        iconLabel={t("tools.duas")}
        title={t("tools.duas")}
        lead={t("tools.duasDesc")}
        nav={[
          { href: "/adhkar", label: th("items.adhkar.title") },
          { href: "/", label: th("backHome") },
        ]}
      />
      <DuasExplorer duas={duas} />
    </ArabyaHubPage>
  );
}
