import "@/components/services/services-hub.css";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { getSurahs } from "@/lib/quran";
import { AdvancedQuranSearch } from "@/components/search/AdvancedQuranSearch";

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
  const surahs = await getSurahs();

  return (
    <div className="shell page-block adv-search-page">
      <nav className="surah-nav" aria-label={t("navAria")}>
        <Link href="/services" className="nav-pill">
          {t("backServices")}
        </Link>
        <Link href="/" className="nav-pill">
          {t("backHome")}
        </Link>
      </nav>

      <header className="services-hub__hero">
        <h1>{t("title")}</h1>
        <p>{t("lead")}</p>
      </header>

      <AdvancedQuranSearch surahs={surahs} />
    </div>
  );
}
