import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { HadithSearchBox } from "@/components/HadithSearchBox";
import { listHadithCollections } from "@/lib/hadith";

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
  const collections = await listHadithCollections();

  return (
    <div className="shell page-block hadith-page">
      <header className="adhkar-hero">
        <p className="adhkar-kicker">{t("kicker")}</p>
        <h1>{t("title")}</h1>
        <p>{t("lead")}</p>
        <div className="home-index-ornament" aria-hidden="true">
          <span className="home-index-ornament-mark" />
        </div>
      </header>

      <HadithSearchBox />

      <section aria-labelledby="hadith-collections-h">
        <h2 id="hadith-collections-h">{t("collectionsTitle")}</h2>
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
                <span>
                  {t("itemCount", { count: c.itemCount ?? 0 })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="layer-hint">{t("provenance")}</p>
      <p>
        <Link href="/heritage">{t("heritageLink")}</Link>
        {" · "}
        <Link href="/">{t("indexLink")}</Link>
      </p>
    </div>
  );
}
