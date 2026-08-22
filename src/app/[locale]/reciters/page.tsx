import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale-params";
import { getReciterCatalog } from "@/lib/reciters-catalog";
import { RecitersCatalogClient } from "@/components/RecitersCatalogClient";
import { formatCount } from "@/lib/format";
import { ArabyaHubHero, ArabyaHubPage } from "@/components/hub/ArabyaHubShell";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Reciters" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function RecitersPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Reciters" });
  const th = await getTranslations({ locale, namespace: "ServicesHub" });
  const reciters = await getReciterCatalog();

  return (
    <ArabyaHubPage className="reciters-page">
      <ArabyaHubHero
        icon="reciters"
        iconLabel={t("title")}
        title={t("title")}
        lead={t("lead", {
          count: formatCount(reciters.length, locale),
        })}
        nav={[
          { href: "/", label: th("backHome") },
          { href: "/favorites", label: t("favoritesLink") },
          { href: "/services", label: th("viewAll") },
        ]}
      />

      <RecitersCatalogClient reciters={reciters} />
    </ArabyaHubPage>
  );
}
