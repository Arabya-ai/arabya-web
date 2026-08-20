import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { getHadithItem } from "@/lib/hadith";
import { getHadithIsnad } from "@/lib/hadith-isnad";
import { HadithWordStudy } from "@/components/HadithWordStudy";

type Props = {
  params: Promise<{ locale: string; collection: string; number: string }>;
};

/** Dynamic — full catalogs are too large for static generation of every hadith. */
export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, collection: slug, number } = await params;
  const hit = await getHadithItem(slug, number);
  if (!hit) return {};
  const title =
    locale === "en" ? hit.collection.titleEn : hit.collection.titleAr;
  return {
    title: `${title} · ${hit.item.number} · Arabya`,
    description: hit.item.arabic.slice(0, 140),
  };
}

export default async function HadithItemPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const { collection: slug, number } = await params;
  const t = await getTranslations({ locale, namespace: "Hadith" });
  const hit = await getHadithItem(slug, number);
  if (!hit) notFound();

  const { collection, item } = hit;
  const title = locale === "en" ? collection.titleEn : collection.titleAr;
  const chapter = locale === "en" ? item.chapterEn : item.chapterAr;
  const isnad = await getHadithIsnad(
    collection.slug,
    item.number,
    item.arabic,
  );

  return (
    <div className="shell page-block hadith-page">
      <nav className="library-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/hadith">{t("title")}</Link>
        <span aria-hidden>/</span>
        <Link href={`/hadith/${collection.slug}`}>{title}</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">#{item.number}</span>
      </nav>

      <article className="hadith-article">
        <p className="hadith-article-meta">
          {title}
          {chapter ? ` · ${chapter}` : ""}
          {item.grade ? ` · ${item.grade}` : ""}
        </p>
        <p className="hadith-article-id">{item.id}</p>

        {isnad ? (
          <section className="hadith-isnad" aria-label={t("isnadTitle")}>
            <h2 className="hadith-isnad-title">{t("isnadTitle")}</h2>
            {isnad.narrators.length > 0 ? (
              <ol className="hadith-isnad-chain" dir="rtl" lang="ar">
                {isnad.narrators.map((name, i) => (
                  <li key={`${name}-${i}`}>{name}</li>
                ))}
              </ol>
            ) : null}
            {isnad.narratorEn ? (
              <p className="hadith-isnad-en" lang="en">
                {t("narratorEn", { name: isnad.narratorEn })}
              </p>
            ) : null}
            <p className="layer-hint">{t("isnadSource", { source: isnad.source })}</p>
          </section>
        ) : (
          <p className="layer-hint">{t("isnadMissing")}</p>
        )}

        <HadithWordStudy
          collection={collection.slug}
          number={item.number}
          arabic={item.arabic}
        />
      </article>

      <p>
        <Link href={`/hadith/${collection.slug}`}>{t("backCollection")}</Link>
      </p>
    </div>
  );
}
