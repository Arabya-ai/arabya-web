import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { getAdhkarCategories } from "@/lib/adhkar";
import { formatCount } from "@/lib/format";
import { AdhkarHubClient } from "@/components/AdhkarHubClient";
import { AdhkarLocalNav } from "@/components/AdhkarLocalNav";
import { ServiceIcon3D } from "@/components/services/ServiceIcon3D";
import { ArabyaHubHero, ArabyaHubPage } from "@/components/hub/ArabyaHubShell";

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
  const th = await getTranslations({ locale, namespace: "ServicesHub" });
  const categories = await getAdhkarCategories();

  return (
    <ArabyaHubPage className="adhkar-page">
      <AdhkarLocalNav locale={locale} current="hub" />

      <ArabyaHubHero
        icon="adhkar"
        iconLabel={t("title")}
        kicker={t("kicker")}
        title={t("title")}
        lead={t("lead")}
        nav={[
          { href: "/", label: th("backHome") },
          { href: "/asma", label: th("items.asma.title") },
          { href: "/services", label: th("viewAll") },
        ]}
      />

      <AdhkarHubClient
        locale={locale}
        categories={categories.map((c) => ({
          slug: c.slug,
          titleAr: c.titleAr,
          titleEn: c.titleEn,
          itemCount: c.itemCount ?? 0,
          targetSum: c.targetSum ?? c.itemCount ?? 0,
        }))}
      />

      <section className="adhkar-tools" aria-labelledby="adhkar-tools-title">
        <h2 id="adhkar-tools-title">{t("toolsHeading")}</h2>
        <ul className="adhkar-tool-grid">
          <li>
            <Link
              href="/adhkar/duas"
              className="adhkar-tool-card adhkar-tool-card--hub"
            >
              <ServiceIcon3D icon="adhkar" label={t("tools.duas")} />
              <span>
                <span className="adhkar-tool-title">{t("tools.duas")}</span>
                <span className="adhkar-tool-desc">{t("tools.duasDesc")}</span>
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/adhkar/hisn"
              className="adhkar-tool-card adhkar-tool-card--hub"
            >
              <ServiceIcon3D icon="books" label={t("tools.hisn")} />
              <span>
                <span className="adhkar-tool-title">{t("tools.hisn")}</span>
                <span className="adhkar-tool-desc">{t("tools.hisnDesc")}</span>
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/adhkar/tasbeeh"
              className="adhkar-tool-card adhkar-tool-card--hub"
            >
              <ServiceIcon3D icon="asma" label={t("tools.tasbeeh")} />
              <span>
                <span className="adhkar-tool-title">{t("tools.tasbeeh")}</span>
                <span className="adhkar-tool-desc">{t("tools.tasbeehDesc")}</span>
              </span>
            </Link>
          </li>
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

      <p className="adhkar-credit">{t("credit")}</p>
    </ArabyaHubPage>
  );
}
