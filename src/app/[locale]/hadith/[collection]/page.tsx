import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { getHadithCollection, listHadithCollections } from "@/lib/hadith";

type Props = {
  params: Promise<{ locale: string; collection: string }>;
};

export async function generateStaticParams() {
  const collections = await listHadithCollections();
  return collections.map((c) => ({ collection: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, collection: slug } = await params;
  const collection = await getHadithCollection(slug);
  if (!collection) return {};
  const title =
    locale === "en" ? collection.titleEn : collection.titleAr;
  return {
    title: `${title} · Arabya`,
    description:
      locale === "en"
        ? collection.descriptionEn || collection.titleEn
        : collection.descriptionAr || collection.titleAr,
  };
}

export default async function HadithCollectionPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const { collection: slug } = await params;
  const t = await getTranslations({ locale, namespace: "Hadith" });
  const collection = await getHadithCollection(slug);
  if (!collection) notFound();

  const title = locale === "en" ? collection.titleEn : collection.titleAr;

  return (
    <div className="shell page-block hadith-page">
      <nav className="library-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">{t("indexLink")}</Link>
        <span aria-hidden>/</span>
        <Link href="/hadith">{t("title")}</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{title}</span>
      </nav>

      <h1>{title}</h1>
      <p className="layer-hint">
        {locale === "en"
          ? collection.descriptionEn
          : collection.descriptionAr}
      </p>

      <ol className="hadith-item-list">
        {collection.items.map((item) => (
          <li key={item.id}>
            <Link href={`/hadith/${collection.slug}/${item.number}`}>
              <span className="hadith-item-num">#{item.number}</span>
              <span className="hadith-item-text" dir="rtl" lang="ar">
                {item.arabic}
              </span>
              {item.grade ? (
                <span className="hadith-item-grade">{item.grade}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
