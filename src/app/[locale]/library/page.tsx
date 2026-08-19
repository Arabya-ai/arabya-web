import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { getLibraryCatalog } from "@/lib/library";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Library" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function LibraryIndexPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Library" });
  const works = await getLibraryCatalog();

  return (
    <div className="shell page-block">
      <h1>{t("title")}</h1>
      <p>{t("intro")}</p>

      {works.length ? (
        <ul className="books-catalog">
          {works.map((w) => {
            const title =
              locale === "en" && w.titleEn ? w.titleEn : w.title;
            const desc =
              locale === "en"
                ? w.descriptionEn || w.description
                : w.description;
            return (
              <li key={w.id} className="books-catalog-item">
                <div>
                  <strong>{title}</strong>
                  {w.author ? (
                    <p className="books-catalog-desc">{w.author}</p>
                  ) : null}
                  {desc ? <p className="books-catalog-desc">{desc}</p> : null}
                  {w.pageCount ? (
                    <p className="books-catalog-status">
                      {t("pageCount", { count: w.pageCount })}
                    </p>
                  ) : null}
                </div>
                <Link href={`/library/${w.id}`}>{t("open")}</Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>{t("empty")}</p>
      )}

      <p className="continue-reading">
        <Link href="/resources" className="continue-link">
          {t("backResources")}
        </Link>
      </p>
    </div>
  );
}
