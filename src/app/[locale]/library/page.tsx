import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { LibraryHubClient } from "@/components/library/LibraryHubClient";
import { libraryCategoryLabel } from "@/lib/library/categories";
import { getLibraryCatalog } from "@/lib/library";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Library" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function LibraryIndexPage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  const { category } = await searchParams;
  const t = await getTranslations({ locale, namespace: "Library" });
  const works = await getLibraryCatalog();
  const activeCategory = category?.trim() || undefined;
  const categoryLabel = activeCategory
    ? libraryCategoryLabel(activeCategory, locale)
    : null;

  return (
    <div className="library-page">
      <section className="library-hero" aria-labelledby="library-hero-title">
        <div className="library-hero-bg" aria-hidden />
        <div className="shell shell--library">
          <nav className="library-breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">{t("breadcrumbHome")}</Link>
            <span aria-hidden>/</span>
            {categoryLabel ? (
              <>
                <Link href="/library">{t("title")}</Link>
                <span aria-hidden>/</span>
                <span aria-current="page">{categoryLabel}</span>
              </>
            ) : (
              <span aria-current="page">{t("title")}</span>
            )}
          </nav>

          <div className="library-hero-content">
            <p className="library-kicker">{t("kicker")}</p>
            <h1 id="library-hero-title">{t("title")}</h1>
            <p className="library-hero-lead">{t("intro")}</p>
            <div className="library-hero-stats">
              <span>{t("statBooks", { count: works.length })}</span>
              <span>{t("statDigital")}</span>
              <span>{t("statFree")}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="shell shell--library library-main">
        <LibraryHubClient
          key={activeCategory ?? "all"}
          locale={locale}
          works={works}
          initialCategory={activeCategory}
          labels={{
            filterPlaceholder: t("filterPlaceholder"),
            sortLatest: t("sortLatest"),
            sortTitle: t("sortTitle"),
            viewGrid: t("viewGrid"),
            viewList: t("viewList"),
            count: t("resultCount"),
            viewBook: t("viewBook"),
            digitalBook: t("digitalBook"),
            pageCount: t("pageCount"),
            loadMore: t("loadMore"),
            allShown: t("allShown"),
            emptyFilter: t("emptyFilter"),
          }}
        />

        <p className="library-back-link">
          <Link href="/resources">{t("backResources")}</Link>
          {" · "}
          <Link href="/account/import">{t("uploadCta")}</Link>
        </p>
      </div>
    </div>
  );
}
