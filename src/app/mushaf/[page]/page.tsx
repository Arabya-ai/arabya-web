import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MushafPageStudio } from "@/components/MushafPageStudio";
import {
  getAdjacentMushafPages,
  getMushafPage,
} from "@/lib/mushaf";
import { getMushafPageHref, toArabicNumerals } from "@/lib/format";
import { getIrab, getTafsirSources, getVerseTranslationEditions, sliceIrabToVerseNumbers } from "@/lib/quran";
import { getSurahUthmaniTitle } from "@/lib/surah-names";

type Props = { params: Promise<{ page: string }> };

/** On-demand generation — avoids building 604 heavy pages at once */
export const dynamicParams = true;
export const revalidate = 86400;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ page: string }>;
  searchParams: Promise<{ v?: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  const { v } = await searchParams;
  const pageNum = Number(page);
  if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > 604) {
    return { title: "صفحة المصحف" };
  }

  const content = await getMushafPage(pageNum);
  if (!content) return { title: "صفحة المصحف" };

  let title =
    content.blocks.length === 1
      ? `${getSurahUthmaniTitle(content.blocks[0].surahId)} — صفحة ${toArabicNumerals(pageNum)}`
      : `صفحة ${toArabicNumerals(pageNum)} — المصحف`;

  let description = `مصحف المدينة — صفحة ${toArabicNumerals(pageNum)} مع دراسة الكلمات — Arabya`;

  const verseMatch = v?.match(/^(\d{1,3}):(\d{1,3})$/);
  if (verseMatch) {
    const surahId = Number(verseMatch[1]);
    const verseNumber = Number(verseMatch[2]);
    const block = content.blocks.find((b) => b.surahId === surahId);
    const verse = block?.verses.find((x) => x.verseNumber === verseNumber);
    if (verse) {
      const snippet = verse.words
        .slice(0, 10)
        .map((w) => w.text)
        .join(" ");
      title = `${getSurahUthmaniTitle(surahId)} ${toArabicNumerals(verseNumber)} · Arabya`;
      description = `${snippet}${verse.words.length > 10 ? " …" : ""} — دراسة الكلمة والإعراب على Arabya`;
    }
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      locale: "ar_AR",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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
  const verseNumbersBySurah = new Map<number, Set<number>>();
  for (const block of pageContent.blocks) {
    let set = verseNumbersBySurah.get(block.surahId);
    if (!set) {
      set = new Set();
      verseNumbersBySurah.set(block.surahId, set);
    }
    for (const verse of block.verses) {
      set.add(verse.verseNumber);
    }
  }

  const irabBySurah: Record<number, Awaited<ReturnType<typeof getIrab>>> = {};

  await Promise.all(
    surahIds.map(async (surahId) => {
      const full = await getIrab(surahId);
      irabBySurah[surahId] = sliceIrabToVerseNumbers(
        full,
        verseNumbersBySurah.get(surahId) ?? new Set(),
      );
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
