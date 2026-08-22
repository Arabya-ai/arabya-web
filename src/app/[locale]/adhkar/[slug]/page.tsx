import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale-params";
import {
  getAdhkarCategories,
  getAdhkarCategory,
} from "@/lib/adhkar";
import { AdhkarCategoryShell } from "@/components/AdhkarCategoryShell";
import { AdhkarLocalNav } from "@/components/AdhkarLocalNav";
import { formatCount } from "@/lib/format";
import { ArabyaHubHero, ArabyaHubPage } from "@/components/hub/ArabyaHubShell";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateStaticParams() {
  const categories = await getAdhkarCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "Adhkar" });
  const category = await getAdhkarCategory(slug);
  if (!category) return { title: t("metaTitle") };
  const title = locale === "en" ? category.titleEn : category.titleAr;
  return {
    title: t("categoryMetaTitle", { title }),
    description: t("metaDescription"),
  };
}

export default async function AdhkarCategoryPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const t = await getTranslations({ locale, namespace: "Adhkar" });
  const th = await getTranslations({ locale, namespace: "ServicesHub" });
  const category = await getAdhkarCategory(slug);
  if (!category) notFound();

  const title = locale === "en" ? category.titleEn : category.titleAr;
  const desc =
    locale === "en"
      ? category.descriptionEn || category.descriptionAr
      : category.descriptionAr || category.descriptionEn;

  return (
    <ArabyaHubPage className="adhkar-page">
      <AdhkarLocalNav locale={locale} current="hub" />
      <ArabyaHubHero
        icon="adhkar"
        iconLabel={title}
        title={title}
        lead={
          desc
            ? `${desc} — ${t("countLabel", {
                count: formatCount(category.items.length, locale),
              })}`
            : t("countLabel", {
                count: formatCount(category.items.length, locale),
              })
        }
        nav={[
          { href: "/adhkar", label: th("items.adhkar.title") },
          { href: "/", label: th("backHome") },
        ]}
      />
      <AdhkarCategoryShell slug={slug} items={category.items} />
    </ArabyaHubPage>
  );
}
