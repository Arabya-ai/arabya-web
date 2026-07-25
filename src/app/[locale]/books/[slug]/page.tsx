import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getBookMeta } from "@/lib/books";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const book = await getBookMeta(slug);
  const t = await getTranslations({ locale, namespace: "Books" });
  return {
    title: book
      ? `${book.title || book.label} · Arabya`
      : t("detailMetaFallback"),
  };
}

export default async function BookViewerPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations("Books");
  const book = await getBookMeta(slug);
  if (!book) notFound();

  return (
    <div className="shell page-block">
      <nav className="surah-nav">
        <Link href="/books" className="nav-pill">
          {t("backCatalog")}
        </Link>
      </nav>
      <h1>{book.title || book.label}</h1>
      {book.status !== "ready" ? (
        <div className="book-awaiting">
          <p>
            {t.rich("awaitingBody", { strong: (c) => <strong>{c}</strong> })}
          </p>
          <p className="layer-source">
            {t.rich("awaitingDoc", { code: (c) => <code>{c}</code> })}
          </p>
        </div>
      ) : (
        <p>{t("readyPlaceholder")}</p>
      )}
    </div>
  );
}
