import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { getReciterCatalogEntry } from "@/lib/reciters-catalog";
import { getSurahs } from "@/lib/quran";
import { getFirstMushafPage, getMushafIndex } from "@/lib/mushaf";
import { formatCount, getMushafPageHref } from "@/lib/format";
import { getSurahDisplayTitle } from "@/lib/surah-names";
import { FavoriteReciterButton } from "@/components/FavoriteReciterButton";
import { UseReciterButton } from "@/components/UseReciterButton";
import { ReciterSurahLink } from "@/components/ReciterSurahLink";
import { ReciterAvatar } from "@/components/ReciterAvatar";
import { RECITERS } from "@/lib/audio";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateStaticParams() {
  return RECITERS.map((r) => ({ id: r.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "Reciters" });
  const entry = await getReciterCatalogEntry(id);
  if (!entry) return { title: t("metaTitle") };
  const name = locale === "en" ? entry.nameEn : entry.nameAr;
  return {
    title: t("detailMetaTitle", { name }),
    description: t("detailMetaDescription", { name }),
  };
}

export default async function ReciterDetailPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const { id } = await params;
  const t = await getTranslations({ locale, namespace: "Reciters" });
  const entry = await getReciterCatalogEntry(id);
  if (!entry) notFound();

  const [surahs, mushaf] = await Promise.all([getSurahs(), getMushafIndex()]);
  const name = locale === "en" ? entry.nameEn : entry.nameAr;
  const bio =
    locale === "en"
      ? entry.meta.bioEn || entry.meta.bioAr
      : entry.meta.bioAr || entry.meta.bioEn;
  const riwaya =
    locale === "en"
      ? entry.meta.riwayaEn || entry.meta.riwayaAr
      : entry.meta.riwayaAr || entry.meta.riwayaEn;
  const country =
    locale === "en"
      ? entry.meta.countryEn || entry.meta.countryAr
      : entry.meta.countryAr || entry.meta.countryEn;
  const firstPage = getFirstMushafPage(1, mushaf);

  return (
    <div className="shell page-block reciter-detail-page">
      <nav className="surah-nav" aria-label={t("navAria")}>
        <Link href="/reciters" className="nav-pill">
          {t("backCatalog")}
        </Link>
        <Link href={getMushafPageHref(firstPage)} className="nav-pill">
          {t("openMushaf")}
        </Link>
      </nav>

      <header className="asma-page-head">
        <div className="reciter-detail-hero">
          <ReciterAvatar name={name} imageUrl={entry.meta.imageUrl} size={88} />
          <div>
            <h1>{name}</h1>
            <ul className="reciter-detail-tags">
              {entry.style ? <li>{entry.style}</li> : null}
              {riwaya ? <li>{riwaya}</li> : null}
              {country ? <li>{country}</li> : null}
              <li>{t("surahCount", { count: formatCount(114, locale) })}</li>
            </ul>
          </div>
        </div>
        {bio ? <p className="reciter-detail-bio">{bio}</p> : null}
        <div className="reciter-detail-actions">
          <UseReciterButton reciterId={entry.id} mushafPage={firstPage} />
          <FavoriteReciterButton reciterId={entry.id} />
        </div>
        <p className="reciter-detail-note">{t("audioNote")}</p>
      </header>

      <section aria-labelledby="reciter-surahs-h">
        <h2 id="reciter-surahs-h">{t("surahsHeading")}</h2>
        <ul className="reciter-surah-list">
          {surahs.map((s) => {
            const page = getFirstMushafPage(s.id, mushaf);
            return (
              <li key={s.id}>
                <ReciterSurahLink
                  reciterId={entry.id}
                  href={getMushafPageHref(page)}
                  className="reciter-surah-link"
                >
                  <span className="reciter-surah-num">
                    {formatCount(s.id, locale)}
                  </span>
                  <span className="reciter-surah-name">
                    {getSurahDisplayTitle(s.id, locale)}
                  </span>
                  <span className="reciter-surah-meta">
                    {t("ayahCount", {
                      count: formatCount(s.versesCount, locale),
                    })}
                  </span>
                </ReciterSurahLink>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
