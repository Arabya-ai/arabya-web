import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { LibraryPdfReader } from "@/components/LibraryPdfReader";
import { LibraryWorkActions } from "@/components/library/LibraryWorkActions";
import {
  LibraryCoverPreview,
  LibraryMetaTable,
  LibraryRelatedBooks,
  LibrarySidebar,
} from "@/components/library/LibraryWorkParts";
import { libraryCategoryLabel } from "@/lib/library/categories";
import { listAllLibraryCategories } from "@/lib/library/custom-categories";
import { getLibraryCatalog, getLibraryWork } from "@/lib/library";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateStaticParams() {
  const works = await getLibraryCatalog();
  return works.map((w) => ({ slug: w.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "Library" });
  const work = await getLibraryWork(slug);
  if (!work) return { title: t("metaTitle") };
  const title = locale === "en" && work.titleEn ? work.titleEn : work.title;
  return {
    title: t("workMetaTitle", { title }),
    description: work.description || t("metaDescription"),
  };
}

export default async function LibraryWorkPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const t = await getTranslations({ locale, namespace: "Library" });
  const work = await getLibraryWork(slug);
  if (!work) notFound();

  const allWorks = await getLibraryCatalog();
  const categories = await listAllLibraryCategories();
  const title = locale === "en" && work.titleEn ? work.titleEn : work.title;
  const desc =
    locale === "en"
      ? work.descriptionEn || work.description
      : work.description;
  const categoryLabel = libraryCategoryLabel(work.category, locale, categories);
  const pageUrl = `/library/${slug}`;

  const metaLabels = {
    bookName: t("metaBookName"),
    author: t("metaAuthor"),
    pages: t("metaPages"),
    category: t("metaCategory"),
    publisher: t("metaPublisher"),
    edition: t("metaEdition"),
    format: t("metaFormat"),
    fileSize: t("metaFileSize"),
  };

  return (
    <div className="library-page library-work-page-wrap">
      <div className="shell shell--library library-work-layout">
        <LibrarySidebar
          locale={locale}
          works={allWorks}
          extraCategories={categories}
          activeCategory={work.category}
          labels={{
            categoriesTitle: t("categoriesTitle"),
            categorySearch: t("categorySearch"),
            relatedTitle: t("relatedTitle"),
            viewBook: t("viewBook"),
            digitalBook: t("digitalBook"),
            pageCount: t("pageCount"),
          }}
        />

        <main className="library-work-main">
          <nav className="library-breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">{t("breadcrumbHome")}</Link>
            <span aria-hidden>/</span>
            <Link href="/library">{t("title")}</Link>
            <span aria-hidden>/</span>
            <Link href={`/library?category=${work.category ?? "education"}`}>
              {categoryLabel}
            </Link>
            <span aria-hidden>/</span>
            <span aria-current="page">{title}</span>
          </nav>

          <header className="library-work-head">
            <h1>{title}</h1>
            <div className="library-work-subhead">
              <span>{work.publisher || "عربية"}</span>
              {work.publishedAt ? <span>{work.publishedAt}</span> : null}
              {work.pageCount ? (
                <span>{t("pageCount", { count: work.pageCount })}</span>
              ) : null}
            </div>
          </header>

          <section className="library-work-intro">
            <LibraryCoverPreview
              work={work}
              locale={locale}
              digitalBookLabel={t("digitalBook")}
            />
            <div className="library-work-intro-meta">
              <LibraryMetaTable
                locale={locale}
                work={work}
                extraCategories={categories}
                labels={metaLabels}
              />
              <LibraryWorkActions
                pdfUrl={work.pdfUrl}
                pageUrl={pageUrl}
                locale={locale}
                labels={{
                  download: t("download"),
                  copyLink: t("copyLink"),
                  share: t("share"),
                  print: t("print"),
                  copied: t("copied"),
                }}
              />
            </div>
          </section>

          <section className="library-work-reader-section" aria-labelledby="library-reader-title">
            <h2 id="library-reader-title">{t("readerTitle")}</h2>
            <LibraryPdfReader pdfUrl={work.pdfUrl} title={title} />
          </section>

          {desc ? (
            <section className="library-work-about" aria-labelledby="library-about-title">
              <h2 id="library-about-title">{t("aboutTitle")}</h2>
              <p>{desc}</p>
            </section>
          ) : null}

          <LibraryRelatedBooks
            locale={locale}
            works={allWorks.filter(
              (w) =>
                w.id !== work.id &&
                (w.category === work.category || !work.category),
            )}
            currentId={work.id}
            labels={{
              categoriesTitle: t("categoriesTitle"),
              categorySearch: t("categorySearch"),
              relatedTitle: t("relatedTitle"),
              viewBook: t("viewBook"),
              digitalBook: t("digitalBook"),
              pageCount: t("pageCount"),
            }}
          />

          <p className="library-back-link">
            <Link href="/library">{t("backCatalog")}</Link>
          </p>
        </main>
      </div>
    </div>
  );
}
