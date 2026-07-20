import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MushafPageStudio } from "@/components/MushafPageStudio";
import {
  getAdjacentMushafPages,
  getMushafPage,
} from "@/lib/mushaf";
import { getMushafPageHref, toArabicNumerals } from "@/lib/format";
import { getIrab, getTafsirSources, getVerseTranslationEditions } from "@/lib/quran";
import { getSurahUthmaniTitle } from "@/lib/surah-names";

type Props = { params: Promise<{ page: string }> };

/** On-demand generation — avoids building 604 heavy pages at once */
export const dynamicParams = true;
export const revalidate = 86400;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await params;
  const pageNum = Number(page);
  if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > 604) {
    return { title: "صفحة المصحف" };
  }

  const content = await getMushafPage(pageNum);
  if (!content) return { title: "صفحة المصحف" };

  const title =
    content.blocks.length === 1
      ? `${getSurahUthmaniTitle(content.blocks[0].surahId)} — صفحة ${toArabicNumerals(pageNum)}`
      : `صفحة ${toArabicNumerals(pageNum)} — المصحف`;

  return {
    title,
    description: `مصحف المدينة — صفحة ${toArabicNumerals(pageNum)} مع دراسة الكلمات — Arabya`,
    openGraph: {
      title,
      description: `ادرس كلمات الصفحة ${toArabicNumerals(pageNum)} مع إعراب وتفسير — Arabya`,
      locale: "ar_AR",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: `صفحة ${toArabicNumerals(pageNum)} — دراسة كلمات القرآن`,
    },
  };
}

export default async function MushafPageRoute({ params }: Props) {
  const { page } = await params;
  const pageNum = Number(page);
  if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > 604) notFound();

  const [pageContent, tafsirSources, verseEditions] = await Promise.all([
    getMushafPage(pageNum),
    getTafsirSources(),
    getVerseTranslationEditions(),
  ]);

  if (!pageContent) notFound();

  const surahIds = [...new Set(pageContent.blocks.map((b) => b.surahId))];
  const irabBySurah: Record<number, Awaited<ReturnType<typeof getIrab>>> = {};

  await Promise.all(
    surahIds.map(async (surahId) => {
      irabBySurah[surahId] = await getIrab(surahId);
    }),
  );

  const { prev, next } = getAdjacentMushafPages(
    pageNum,
    pageContent.totalPages,
  );

  return (
    <div className="shell page-block">
      <nav className="surah-nav" aria-label="تقليب صفحات المصحف">
        {prev ? (
          <Link href={getMushafPageHref(prev)} className="nav-pill">
            ← الصفحة السابقة
          </Link>
        ) : (
          <span />
        )}
        <Link href="/" className="nav-pill">
          الفهرس
        </Link>
        {next ? (
          <Link href={getMushafPageHref(next)} className="nav-pill">
            الصفحة التالية →
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <MushafPageStudio
        page={pageContent}
        irabBySurah={irabBySurah}
        tafsirSources={tafsirSources}
        verseEditions={verseEditions}
      />
    </div>
  );
}
