import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { getBookCatalog } from "@/lib/books";
import { ArabyaHubHero, ArabyaHubPage } from "@/components/hub/ArabyaHubShell";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Books" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

function statusKey(
  status: string | undefined,
): "statusReady" | "statusReview" | "statusAwaiting" {
  if (status === "ready") return "statusReady";
  if (status === "review") return "statusReview";
  return "statusAwaiting";
}

export default async function BooksIndexPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Books" });
  const th = await getTranslations({ locale, namespace: "ServicesHub" });
  const books = await getBookCatalog();

  return (
    <ArabyaHubPage>
      <ArabyaHubHero
        icon="books"
        iconLabel={t("title")}
        title={t("title")}
        lead={t("intro")}
        nav={[
          { href: "/", label: th("backHome") },
          { href: "/library", label: th("items.library.title") },
          { href: "/services", label: th("viewAll") },
        ]}
      >
        <p className="layer-hint" style={{ marginTop: "0.75rem" }}>
          {t.rich("libraryHint", {
            library: (c) => <Link href="/library">{c}</Link>,
          })}
        </p>
      </ArabyaHubHero>

      {books.length ? (
        <ul className="books-catalog">
          {books.map((b) => (
            <li key={b.id} className="books-catalog-item">
              <div>
                <strong>{b.title || b.label}</strong>
                <p className="books-catalog-status">
                  {t("statusLabel", {
                    status: t(statusKey(b.status)),
                  })}
                </p>
                {b.description ? (
                  <p className="books-catalog-desc">{b.description}</p>
                ) : null}
              </div>
              <Link href={`/books/${b.id}`}>
                {b.status === "ready" ? t("open") : t("viewStatus")}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>{t("empty")}</p>
      )}

      <p className="continue-reading">
        <Link href="/mushaf/1" className="continue-link">
          {t("backMushaf")}
        </Link>
      </p>
    </ArabyaHubPage>
  );
}
