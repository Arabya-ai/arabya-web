import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { getReciterCatalog } from "@/lib/reciters-catalog";
import { RecitersCatalogClient } from "@/components/RecitersCatalogClient";
import { formatCount } from "@/lib/format";

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
  const reciters = await getReciterCatalog();

  return (
    <div className="shell page-block reciters-page">
      <nav className="surah-nav" aria-label={t("navAria")}>
        <Link href="/" className="nav-pill">
          {t("backIndex")}
        </Link>
        <Link href="/favorites" className="nav-pill">
          {t("favoritesLink")}
        </Link>
      </nav>

      <header className="asma-page-head">
        <h1>{t("title")}</h1>
        <p>
          {t("lead", {
            count: formatCount(reciters.length, locale),
          })}
        </p>
      </header>

      <RecitersCatalogClient reciters={reciters} />
    </div>
  );
}
