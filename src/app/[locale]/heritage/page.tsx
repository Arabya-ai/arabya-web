import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { listHeritageWorks } from "@/lib/heritage";
import { RemoteSiyarBrowser } from "@/components/RemoteSiyarBrowser";

type Props = { params: Promise<{ locale: string }> };

type BinbazBook = {
  id: number;
  titleAr: string;
  sourceUrl?: string;
  pdfCount?: number;
};

async function loadBinbazCatalog(): Promise<BinbazBook[]> {
  try {
    const raw = await readFile(
      path.join(process.cwd(), "data", "heritage", "catalogs", "binbaz-books.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as { books?: BinbazBook[] };
    return (parsed.books ?? []).slice(0, 24);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Heritage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function HeritageHubPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Heritage" });
  const works = await listHeritageWorks();
  const binbaz = await loadBinbazCatalog();

  return (
    <div className="shell page-block heritage-page">
      <header className="adhkar-hero">
        <p className="adhkar-kicker">{t("kicker")}</p>
        <h1>{t("title")}</h1>
        <p>{t("lead")}</p>
        <div className="home-index-ornament" aria-hidden="true">
          <span className="home-index-ornament-mark" />
        </div>
      </header>

      <ul className="heritage-work-grid">
        {works.map((w) => (
          <li key={w.slug}>
            <Link href={`/heritage/${w.slug}`} className="heritage-work-card">
              <span className="heritage-kind">{t(`kind.${w.kind}` as "kind.poetry")}</span>
              <strong>{locale === "en" ? w.titleEn : w.titleAr}</strong>
              <p>{locale === "en" ? w.descriptionEn : w.descriptionAr}</p>
              <span>
                {t("passageCount", { count: w.passageCount ?? 0 })}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {binbaz.length > 0 ? (
        <section className="heritage-binbaz" aria-label={t("binbazCatalog")}>
          <h2>{t("binbazCatalog")}</h2>
          <p className="layer-hint">{t("binbazCatalogLead")}</p>
          <ul className="heritage-binbaz-list">
            {binbaz.map((b) => (
              <li key={b.id}>
                {b.sourceUrl ? (
                  <a href={b.sourceUrl} rel="noopener noreferrer" target="_blank">
                    {b.titleAr}
                  </a>
                ) : (
                  <span>{b.titleAr}</span>
                )}
                {b.pdfCount ? (
                  <span className="heritage-kind"> · PDF×{b.pdfCount}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <RemoteSiyarBrowser />

      <p>
        <Link href="/library" className="nav-pill">
          {t("libraryLink")}
        </Link>
      </p>
      <p>
        <Link href="/hadith">{t("hadithLink")}</Link>
        {" · "}
        <Link href="/">{t("indexLink")}</Link>
      </p>
    </div>
  );
}
