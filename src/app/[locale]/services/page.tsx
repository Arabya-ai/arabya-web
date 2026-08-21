import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { ServicesGrid } from "@/components/services/ServicesGrid";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ServicesHub" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ServicesPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "ServicesHub" });

  return (
    <div className="shell page-block services-hub">
      <nav className="surah-nav" aria-label={t("navAria")}>
        <Link href="/" className="nav-pill">
          {t("backHome")}
        </Link>
        <Link href="/resources" className="nav-pill">
          {t("toResources")}
        </Link>
      </nav>

      <header className="services-hub__hero">
        <h1>{t("title")}</h1>
        <p>{t("lead")}</p>
      </header>

      <ServicesGrid variant="page" grouped />
    </div>
  );
}
