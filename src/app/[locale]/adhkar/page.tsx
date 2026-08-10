import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { getAdhkarCategories } from "@/lib/adhkar";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Adhkar" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function AdhkarIndexPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Adhkar" });
  const categories = await getAdhkarCategories();

  return (
    <div className="shell page-block adhkar-page">
      <nav className="surah-nav" aria-label={t("navAria")}>
        <Link href="/" className="nav-pill">
          {t("backIndex")}
        </Link>
      </nav>

      <header className="asma-page-head">
        <h1>{t("title")}</h1>
        <p>{t("lead")}</p>
      </header>

      {categories.length === 0 ? (
        <p className="empty-state">{t("empty")}</p>
      ) : (
        <ul className="adhkar-category-grid">
          {categories.map((c) => {
            const title = locale === "en" ? c.titleEn : c.titleAr;
            const desc =
              locale === "en"
                ? c.descriptionEn || c.descriptionAr
                : c.descriptionAr || c.descriptionEn;
            return (
              <li key={c.slug}>
                <Link href={`/adhkar/${c.slug}`} className="adhkar-category-link">
                  <span className="adhkar-category-title">{title}</span>
                  {desc ? (
                    <span className="adhkar-category-desc">{desc}</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
