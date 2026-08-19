import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { LibraryPdfReader } from "@/components/LibraryPdfReader";
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

  const title = locale === "en" && work.titleEn ? work.titleEn : work.title;
  const desc =
    locale === "en"
      ? work.descriptionEn || work.description
      : work.description;

  return (
    <div className="shell page-block library-work-page">
      <p>
        <Link href="/library" className="nav-pill">
          {t("backCatalog")}
        </Link>
      </p>

      <header className="asma-page-head">
        <h1>{title}</h1>
        {work.author ? <p>{work.author}</p> : null}
        {desc ? <p>{desc}</p> : null}
        {work.pageCount ? (
          <p className="books-catalog-status">
            {t("pageCount", { count: work.pageCount })}
          </p>
        ) : null}
      </header>

      <LibraryPdfReader pdfUrl={work.pdfUrl} title={title} />

      <p style={{ marginTop: "1rem" }}>
        <a href={work.pdfUrl} target="_blank" rel="noreferrer" className="nav-pill">
          {t("openNewTab")}
        </a>
      </p>
    </div>
  );
}
