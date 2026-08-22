import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getBookMeta } from "@/lib/books";
import { ArabyaHubHero, ArabyaHubPage } from "@/components/hub/ArabyaHubShell";

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

function statusKey(
  status: string | undefined,
): "statusReady" | "statusReview" | "statusAwaiting" {
  if (status === "ready") return "statusReady";
  if (status === "review") return "statusReview";
  return "statusAwaiting";
}

export default async function BookViewerPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations({ locale, namespace: "Books" });
  const th = await getTranslations({ locale, namespace: "ServicesHub" });
  const book = await getBookMeta(slug);
  if (!book) notFound();

  const bookTitle = book.title || book.label;

  return (
    <ArabyaHubPage className="books-detail-page">
      <ArabyaHubHero
        icon="books"
        iconLabel={bookTitle}
        kicker={t(statusKey(book.status))}
        title={bookTitle}
        nav={[
          { href: "/books", label: t("backCatalog") },
          { href: "/services", label: th("viewAll") },
          { href: "/", label: th("backHome") },
        ]}
      />
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
    </ArabyaHubPage>
  );
}
