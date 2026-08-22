import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { getHadithItem } from "@/lib/hadith";
import { getHadithIsnad } from "@/lib/hadith-isnad";
import { HadithWordStudy } from "@/components/HadithWordStudy";
import { ArabyaHubHero, ArabyaHubPage } from "@/components/hub/ArabyaHubShell";

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
  const th = await getTranslations({ locale, namespace: "ServicesHub" });
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

  const idx = collection.items.findIndex((h) => h.id === item.id);
  const prev = idx > 0 ? collection.items[idx - 1] : null;
  const next =
    idx >= 0 && idx < collection.items.length - 1
      ? collection.items[idx + 1]
      : null;

  const metaParts = [
    title,
    chapter || null,
    item.grade || null,
  ].filter(Boolean);

  return (
    <ArabyaHubPage className="hadith-page">
      <ArabyaHubHero
        icon="hadith"
        iconLabel={title}
        kicker={title}
        title={`#${item.number}`}
        lead={metaParts.length > 1 ? metaParts.slice(1).join(" · ") : item.id}
        nav={[
          { href: "/hadith", label: t("title") },
          { href: `/hadith/${collection.slug}`, label: title },
          { href: "/", label: th("backHome") },
        ]}
      />

      <article className="hadith-article">
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

      <nav className="hadith-item-pager" aria-label={t("hadithPagerAria")}>
        {prev ? (
          <Link href={`/hadith/${collection.slug}/${prev.number}`} className="nav-pill">
            {t("prevHadith")}
          </Link>
        ) : (
          <span className="books-catalog-muted" aria-hidden>
            —
          </span>
        )}
        {next ? (
          <Link href={`/hadith/${collection.slug}/${next.number}`} className="nav-pill">
            {t("nextHadith")}
          </Link>
        ) : (
          <span className="books-catalog-muted" aria-hidden>
            —
          </span>
        )}
      </nav>

      <p>
        <Link href={`/hadith/${collection.slug}`} className="nav-pill">
          {t("backCollection")}
        </Link>
      </p>
    </ArabyaHubPage>
  );
}
