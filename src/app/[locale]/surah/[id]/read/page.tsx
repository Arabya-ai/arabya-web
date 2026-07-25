import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSurah, getSurahMeta } from "@/lib/quran";
import { getMushafPageHref, toArabicNumerals } from "@/lib/format";
import { normalizeForHafsFont } from "@/lib/quran-text";
import { getSurahDisplayTitle, getSurahUthmaniTitle } from "@/lib/surah-names";
import { getMushafIndex } from "@/lib/mushaf";
import { SurahOrnamentTitle } from "@/components/SurahOrnamentTitle";
import { StudyVerseButton } from "@/components/StudyVerseButton";
import {
  BASMALAH_UTHMANI,
  surahHasBasmalah,
} from "@/hooks/mushaf-utils";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const sid = Number(id);
  const t = await getTranslations({ locale, namespace: "Surah" });
  if (!Number.isInteger(sid)) return { title: t("metaFallback") };
  const surahTitle = getSurahDisplayTitle(sid, locale);
  return {
    title: t("metaTitle", { surah: surahTitle }),
    description: t("metaDescription", { surah: surahTitle }),
  };
}

export default async function SurahReadPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations("Surah");
  const tNav = await getTranslations("Nav");
  const surahId = Number(id);
  if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) notFound();

  const [surah, meta, mushaf] = await Promise.all([
    getSurah(surahId),
    getSurahMeta(surahId),
    getMushafIndex(),
  ]);
  if (!surah || !meta) notFound();

  const firstPage = mushaf.surahFirstPage[String(surahId)] ?? 1;
  const verseCount =
    locale === "en" ? String(meta.versesCount) : toArabicNumerals(meta.versesCount);

  return (
    <div className="shell page-block surah-read-page">
      <nav className="surah-nav">
        <Link href="/" className="nav-pill">
          {tNav("index")}
        </Link>
        <Link href={getMushafPageHref(firstPage)} className="nav-pill">
          {tNav("mushaf")}
        </Link>
      </nav>

      <header className="surah-read-head">
        <SurahOrnamentTitle title={getSurahUthmaniTitle(surahId)} />
        {surahHasBasmalah(surahId) ? (
          <p className="mushaf-basmalah mushaf-basmalah--read" lang="ar">
            {normalizeForHafsFont(BASMALAH_UTHMANI)}
          </p>
        ) : null}
        <p>
          {t("verseMeta", {
            revelation: meta.revelationLabel,
            count: verseCount,
            juz: meta.juzLabel,
          })}
        </p>
      </header>

      <div className="surah-read-body" dir="rtl" lang="ar">
        {surah.verses.map((v) => {
          const verseText = v.words
            .filter((w) => !w.charType || w.charType === "word")
            .map((w) => normalizeForHafsFont(w.text))
            .join(" ");
          return (
            <article
              key={v.verseNumber}
              className="surah-read-ayah"
              id={`v-${v.verseNumber}`}
            >
              <div className="surah-read-ayah-text" dir="rtl" lang="ar">
                {verseText}
                <span className="ayah-end-mark">
                  {toArabicNumerals(v.verseNumber)}
                </span>
              </div>
              <div className="surah-read-actions">
                <Link
                  href={`/ayah/${surahId}/${v.verseNumber}`}
                  className="nav-pill"
                >
                  {tNav("ayahIrab")}
                </Link>
                <Link
                  href={`${getMushafPageHref(v.page || firstPage)}?v=${surahId}:${v.verseNumber}`}
                  className="nav-pill"
                >
                  {tNav("readInMushaf")}
                </Link>
                <StudyVerseButton verseText={verseText} />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
