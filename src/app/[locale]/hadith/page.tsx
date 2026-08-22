import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { HadithSearchBox } from "@/components/HadithSearchBox";
import { listHadithCollections } from "@/lib/hadith";
import { ArabyaHubHero, ArabyaHubPage } from "@/components/hub/ArabyaHubShell";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Hadith" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function HadithHubPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Hadith" });
  const th = await getTranslations({ locale, namespace: "ServicesHub" });
  const collections = await listHadithCollections();

  return (
    <ArabyaHubPage className="hadith-page">
      <ArabyaHubHero
        icon="hadith"
        iconLabel={t("title")}
        kicker={t("kicker")}
        title={t("title")}
        lead={t("lead")}
        nav={[
          { href: "/", label: th("backHome") },
          { href: "/services", label: th("viewAll") },
          { href: "/heritage", label: th("items.heritage.title") },
        ]}
      />

      <HadithSearchBox />

      <section aria-labelledby="hadith-collections-h">
        <h2 id="hadith-collections-h" className="svc-group__title">
          {t("collectionsTitle")}
        </h2>
        <ul className="hadith-collection-grid">
          {collections.map((c) => (
            <li key={c.slug}>
              <Link href={`/hadith/${c.slug}`} className="hadith-collection-card">
                <strong>
                  {locale === "en" ? c.titleEn : c.titleAr}
                </strong>
                <p>
                  {locale === "en"
                    ? c.descriptionEn
                    : c.descriptionAr}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </ArabyaHubPage>
  );
}
