import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getIrab, getSurah, getSurahMeta } from "@/lib/quran";
import { getMushafIndex } from "@/lib/mushaf";
import { formatVerseKey, getMushafPageHref, toArabicNumerals } from "@/lib/format";
import { normalizeForHafsFont } from "@/lib/quran-text";
import { narrativeIrab } from "@/lib/irab-narrative";
import { getIrabClaimsForAyah } from "@/lib/irab-claims";
import { claimsHaveAlternates } from "@/lib/claims";
import { makeWordId } from "@/lib/word-id";
import { IrabClaimsCompare } from "@/components/IrabClaimsCompare";
import { getSurahDisplayTitle } from "@/lib/surah-names";
import { PageShareButton } from "@/components/PageShareButton";
import { buildSocialMetadata } from "@/lib/og-meta";
import { shareOgImageUrl } from "@/lib/share";
import { studioCreateFromAyahHref } from "@/ayat-studio/lib/studio-paths";

type Props = { params: Promise<{ locale: string; surah: string; verse: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, surah, verse } = await params;
  const sid = Number(surah);
  const vid = Number(verse);
  const t = await getTranslations({ locale, namespace: "Ayah" });
  if (!Number.isInteger(sid) || !Number.isInteger(vid)) {
    return { title: t("metaFallback") };
  }
  const surahTitle = getSurahDisplayTitle(sid, locale);
  const title = t("metaTitle", {
    surah: surahTitle,
    verse: locale === "en" ? String(vid) : toArabicNumerals(vid),
  });
  const description = t("metaDescription", {
    key: formatVerseKey(`${sid}:${vid}`, locale),
  });
  const social = buildSocialMetadata({
    title,
    description,
    url: `/ayah/${sid}/${vid}?share=irab`,
    imageUrl: shareOgImageUrl({
      kind: "irab",
      verse: `${sid}:${vid}`,
      surahId: sid,
      locale,
    }),
    locale,
  });
  return {
    title,
    description,
    ...social,
  };
}

export default async function AyahIrabPage({ params }: Props) {
  const { locale, surah, verse } = await params;
  const t = await getTranslations("Ayah");
  const tNav = await getTranslations("Nav");
  const surahId = Number(surah);
  const verseNumber = Number(verse);
  if (
    !Number.isInteger(surahId) ||
    surahId < 1 ||
    surahId > 114 ||
    !Number.isInteger(verseNumber) ||
    verseNumber < 1
  ) {
    notFound();
  }

  const uiLocale = locale === "en" ? "en" : "ar";

  const [content, irab, meta, mushaf, claimsBundle] = await Promise.all([
    getSurah(surahId),
    getIrab(surahId),
    getSurahMeta(surahId),
    getMushafIndex(),
    getIrabClaimsForAyah(surahId, verseNumber, uiLocale),
  ]);

  const ayah = content?.verses.find((v) => v.verseNumber === verseNumber);
  const irabVerse = irab?.verses.find((v) => v.verseNumber === verseNumber);
  if (!ayah || !meta) notFound();

  const pageEntry =
    Object.entries(mushaf.pages ?? {}).find(([, verses]) =>
      verses.some(
        (v) => v.surahId === surahId && v.verseNumber === verseNumber,
      ),
    )?.[0] ?? null;

  const pageNum = ayah.page || (pageEntry ? Number(pageEntry) : null) ||
    mushaf.surahFirstPage[String(surahId)];

  const surahTitle = getSurahDisplayTitle(surahId, locale);
  const verseLabel =
    locale === "en" ? String(verseNumber) : toArabicNumerals(verseNumber);

  return (
    <div className="shell page-block ayah-irab-page">
      <nav className="surah-nav" aria-label={t("navAria")}>
        <Link href="/" className="nav-pill">
          {tNav("index")}
        </Link>
        {pageNum ? (
          <Link
            href={`${getMushafPageHref(Number(pageNum))}?v=${surahId}:${verseNumber}`}
            className="nav-pill"
          >
            {tNav("mushaf")}
          </Link>
        ) : null}
        <Link href={`/surah/${surahId}/read`} className="nav-pill">
          {tNav("studySurah")}
        </Link>
      </nav>

      <header className="ayah-irab-head">
        <h1>
          {t("pageTitle", { surah: surahTitle, verse: verseLabel })}
        </h1>
        <p className="ayah-irab-text" dir="rtl" lang="ar">
          {ayah.words
            .filter((w) => !w.charType || w.charType === "word")
            .map((w) => normalizeForHafsFont(w.text))
            .join(" ")}
        </p>
        <div className="root-share-row">
          <PageShareButton
            title={t("shareTitle", {
              surah: surahTitle,
              verseNum: verseNumber,
            })}
            text={t("shareText", {
              surah: surahTitle,
              verse: verseLabel,
            })}
            path={`/ayah/${surahId}/${verseNumber}?share=irab`}
            kind="irab"
            label={t("shareLabel")}
            hint={t("shareHint")}
          />
          <Link
            href={studioCreateFromAyahHref({
              surahId,
              verse: verseNumber,
              kind: "image",
            })}
            className="nav-pill"
          >
            {t("createImage")}
          </Link>
          <Link
            href={studioCreateFromAyahHref({
              surahId,
              verse: verseNumber,
              kind: "video",
            })}
            className="nav-pill"
          >
            {t("createVideo")}
          </Link>
        </div>
      </header>

      {claimsBundle.ayahLevel.length ? (
        <section className="irab-claims-ayah-level" aria-label={t("bookIrabTitle")}>
          <h2 className="irab-claims-ayah-level__title">{t("bookIrabTitle")}</h2>
          <ul className="irab-claims-stack">
            {claimsBundle.ayahLevel.map((c) => (
              <li key={c.id} className="irab-claims-stack__item">
                <span className="irab-claims-stack__source">{c.sourceLabel}</span>
                <p className="irab-claims-stack__text">{c.text}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ol className="ayah-irab-list">
        {ayah.words
          .filter((w) => !w.charType || w.charType === "word")
          .map((w) => {
            const morph = irabVerse?.words.find((x) => x.position === w.position);
            const wordId =
              morph?.wordId ?? makeWordId(surahId, verseNumber, w.position);
            const claims = claimsBundle.byWordId.get(wordId) ?? [];
            const sense =
              locale === "en"
                ? w.meaning || w.meaningAr || ""
                : w.meaningAr || w.meaning || "";
            const expanded = claimsHaveAlternates(claims);
            const fallbackIrab = narrativeIrab(morph ?? null, uiLocale);
            return (
              <li key={w.position} className="ayah-irab-item">
                <span className="ayah-irab-word">
                  {normalizeForHafsFont(w.text)}
                </span>
                <span className="ayah-irab-detail">
                  {claims.length ? (
                    <IrabClaimsCompare
                      claims={claims}
                      locale={uiLocale}
                      expanded={expanded}
                    />
                  ) : (
                    fallbackIrab
                  )}
                </span>
                {sense ? (
                  <span className="ayah-irab-sense">{sense}</span>
                ) : null}
                {expanded ? (
                  <span className="ayah-irab-alt-badge">{t("multiSource")}</span>
                ) : null}
              </li>
            );
          })}
      </ol>
    </div>
  );
}
