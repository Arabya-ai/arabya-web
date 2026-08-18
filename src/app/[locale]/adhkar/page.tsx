import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { getAdhkarCategories } from "@/lib/adhkar";
import { formatCount } from "@/lib/format";
import { AdhkarLocalNav } from "@/components/AdhkarLocalNav";
import { PrayerTimesCard } from "@/components/PrayerTimesCard";

type Props = { params: Promise<{ locale: string }> };

const TOOLS = [
  { href: "/adhkar/duas", key: "duas" as const },
  { href: "/adhkar/tasbeeh", key: "tasbeeh" as const },
  { href: "/adhkar/qibla", key: "qibla" as const },
] as const;

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
      <AdhkarLocalNav locale={locale} current="hub" />

      <header className="adhkar-hero">
        <p className="adhkar-kicker">{t("kicker")}</p>
        <h1>{t("title")}</h1>
        <p>{t("lead")}</p>
        <div className="home-index-ornament" aria-hidden="true">
          <span className="home-index-ornament-mark" />
        </div>
      </header>

      <section className="adhkar-tools" aria-labelledby="adhkar-tools-title">
        <h2 id="adhkar-tools-title">{t("toolsHeading")}</h2>
        <ul className="adhkar-tool-grid">
          {TOOLS.map((tool) => (
            <li key={tool.href}>
              <Link href={tool.href} className="adhkar-tool-card">
                <span className="adhkar-tool-mark" aria-hidden />
                <span className="adhkar-tool-title">{t(`tools.${tool.key}`)}</span>
                <span className="adhkar-tool-desc">{t(`tools.${tool.key}Desc`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="adhkar-cats-title">
        <h2 id="adhkar-cats-title">{t("categoriesHeading")}</h2>
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
                    {typeof c.itemCount === "number" ? (
                      <span className="adhkar-category-count">
                        {t("countLabel", {
                          count: formatCount(c.itemCount, locale),
                        })}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <PrayerTimesCard />

      <p className="adhkar-credit">{t("credit")}</p>
    </div>
  );
}
