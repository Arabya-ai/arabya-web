import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MushafPageStudio } from "@/components/MushafPageStudio";
import { MushafPageNav } from "@/components/mushaf/MushafPageNav";
import {
  getAdjacentMushafPages,
  getMushafPage,
} from "@/lib/mushaf";
import { toArabicNumerals } from "@/lib/format";
import {
  getTafsirSources,
  getVerseTranslationEditions,
} from "@/lib/quran";
import { getSurahDisplayTitle } from "@/lib/surah-names";
import { buildSocialMetadata } from "@/lib/og-meta";
import { shareOgImageUrl, type ShareKind } from "@/lib/share";
import { isAppLocale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string; page: string }> };

function formatMetaNum(value: number, locale: string): string {
  return locale === "ar" ? toArabicNumerals(value) : String(value);
}

/** On-demand generation — avoids building 604 heavy pages at once */
export const dynamicParams = true;
export const revalidate = 86400;

function resolveShareKind(
  share: string | undefined,
  listen: string | undefined,
): ShareKind {
  if (share === "ayah" || share === "page" || share === "surah" || share === "note") {
    return share;
  }
  if (share === "listen-ayah" || share === "listen-surah" || share === "listen-wbw") {
    return share;
  }
  if (listen === "surah") return "listen-surah";
  if (listen === "wbw") return "listen-wbw";
  if (listen === "ayah") return "listen-ayah";
  if (share === "listen") {
    if (listen === "surah") return "listen-surah";
    if (listen === "wbw") return "listen-wbw";
    return "listen-ayah";
  }
  return "page";
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; page: string }>;
  searchParams: Promise<{
    v?: string;
    listen?: string;
    reciter?: string;
    share?: string;
    sid?: string;
  }>;
}): Promise<Metadata> {
  const { locale: rawLocale, page } = await params;
  const locale = isAppLocale(rawLocale) ? rawLocale : "ar";
  const t = await getTranslations({ locale, namespace: "Mushaf.meta" });
  const { v, listen, share, sid } = await searchParams;
  const pageNum = Number(page);
  if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > 604) {
    return { title: t("pageTitle") };
  }

  const content = await getMushafPage(pageNum);
  if (!content) return { title: t("pageTitle") };

  const pageLabel = formatMetaNum(pageNum, locale);
  const kind = resolveShareKind(share, listen);
  let title =
    content.blocks.length === 1
      ? t("pageWithSurah", {
          surah: getSurahDisplayTitle(content.blocks[0].surahId, locale),
          page: pageLabel,
        })
      : t("pageOnly", { page: pageLabel });
  let description = t("description", { page: pageLabel });

  const verseMatch = v?.match(/^(\d{1,3}):(\d{1,3})$/);
  const surahFromSid = sid ? Number(sid) : null;
  let surahId = surahFromSid;
  let verseNumber: number | null = null;

  if (verseMatch) {
    surahId = Number(verseMatch[1]);
    verseNumber = Number(verseMatch[2]);
    const block = content.blocks.find((b) => b.surahId === surahId);
    const verse = block?.verses.find((x) => x.verseNumber === verseNumber!);
    if (verse) {
      const snippet = verse.words
        .slice(0, 10)
        .map((w) => w.text)
        .join(" ");
      const verseLabel = formatMetaNum(verseNumber!, locale);
      title = `${getSurahDisplayTitle(surahId!, locale)} ${verseLabel}${t("brandSuffix")}`;
      description = `${snippet}${verse.words.length > 10 ? " …" : ""}${t("ayahDescriptionSuffix")}`;
    }
  } else if (surahId && (kind === "surah" || kind === "listen-surah")) {
    const surahTitle = getSurahDisplayTitle(surahId, locale);
    title = `${surahTitle}${t("brandSuffix")}`;
    description = t("surahDescription", { surah: surahTitle });
  }

  if (kind === "listen-surah") {
    title = `${t("listenSurahPrefix")}${title}`;
    description = `${t("listenSurahDescPrefix")}${description}`;
  } else if (kind === "listen-ayah") {
    title = `${t("listenAyahPrefix")}${title}`;
    description = `${t("listenAyahDescPrefix")}${description}`;
  } else if (kind === "listen-wbw") {
    title = `${t("listenWbwPrefix")}${title}`;
    description = `${t("listenWbwDescPrefix")}${description}`;
  } else if (share === "ayah") {
    title = `${t("shareAyahPrefix")}${title}`;
  } else if (share === "surah") {
    title = `${t("shareSurahPrefix")}${title}`;
  } else if (share === "page") {
    title = `${t("sharePagePrefix")}${title}`;
  } else if (share === "note") {
    title = `${t("shareNotePrefix")}${title}`;
  }

  const pathParams = new URLSearchParams();
  if (share) pathParams.set("share", kind);
  if (v) pathParams.set("v", v);
  if (sid) pathParams.set("sid", sid);
  if (listen) pathParams.set("listen", listen);
  const qs = pathParams.toString();
  const path = qs ? `/mushaf/${pageNum}?${qs}` : `/mushaf/${pageNum}`;

  const social = buildSocialMetadata({
    title,
    description,
    url: path,
    imageUrl: shareOgImageUrl({
      kind,
      page: pageNum,
      verse: v || undefined,
      surahId: surahId || undefined,
      locale,
    }),
    imageAlt: title,
    locale,
  });

  return {
    title,
    description,
    ...social,
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

  const { prev, next } = getAdjacentMushafPages(
    pageNum,
    pageContent.totalPages,
  );

  return (
    <div className="shell page-block">
      <MushafPageNav prev={prev} next={next} />

      <MushafPageStudio
        page={pageContent}
        tafsirSources={tafsirSources}
        verseEditions={verseEditions}
      />
    </div>
  );
}
