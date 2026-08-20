import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import {
  getHadithCollection,
  listHadithCollections,
  paginateHadithItems,
} from "@/lib/hadith";

type Props = {
  params: Promise<{ locale: string; collection: string }>;
  searchParams: Promise<{ page?: string }>;
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

export default async function HadithCollectionPage({
  params,
  searchParams,
}: Props) {
  const locale = await resolveLocale(params);
  const { collection: slug } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "Hadith" });
  const collection = await getHadithCollection(slug);
  if (!collection) notFound();

  const pageNum = Math.max(1, Number(sp.page) || 1);
  const page = paginateHadithItems(collection.items, pageNum, 40);
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
      <p className="hadith-count">
        {t("itemCount", { count: page.total })}
        {page.totalPages > 1
          ? ` · ${t("pageOf", { page: page.page, total: page.totalPages })}`
          : null}
      </p>

      <ol className="hadith-item-list" start={(page.page - 1) * page.pageSize + 1}>
        {page.items.map((item) => (
          <li key={item.id}>
            <Link href={`/hadith/${collection.slug}/${item.number}`}>
              <span className="hadith-item-num">#{item.number}</span>
              <span className="hadith-item-text" dir="rtl" lang="ar">
                {item.arabic.length > 280
                  ? `${item.arabic.slice(0, 280)}…`
                  : item.arabic}
              </span>
              {item.grade ? (
                <span className="hadith-item-grade">{item.grade}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ol>

      {page.totalPages > 1 ? (
        <nav className="hadith-pager" aria-label={t("pagerAria")}>
          {page.page > 1 ? (
            <Link
              href={`/hadith/${collection.slug}?page=${page.page - 1}`}
              className="nav-pill"
            >
              {t("prevPage")}
            </Link>
          ) : null}
          {page.page < page.totalPages ? (
            <Link
              href={`/hadith/${collection.slug}?page=${page.page + 1}`}
              className="nav-pill"
            >
              {t("nextPage")}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
