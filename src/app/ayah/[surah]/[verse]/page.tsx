import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getIrab, getSurah, getSurahMeta } from "@/lib/quran";
import { getMushafIndex } from "@/lib/mushaf";
import { formatVerseKey, getMushafPageHref, toArabicNumerals } from "@/lib/format";
import { normalizeForHafsFont } from "@/lib/quran-text";
import { narrativeIrab } from "@/lib/irab-narrative";
import { getSurahUthmaniTitle } from "@/lib/surah-names";

type Props = { params: Promise<{ surah: string; verse: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { surah, verse } = await params;
  const sid = Number(surah);
  const vid = Number(verse);
  if (!Number.isInteger(sid) || !Number.isInteger(vid)) {
    return { title: "إعراب آية" };
  }
  const title = `إعراب ${getSurahUthmaniTitle(sid)} ${toArabicNumerals(vid)} · Arabya`;
  return {
    title,
    description: `إعراب مفصّل لآية ${formatVerseKey(`${sid}:${vid}`)} من مصادر مفتوحة — Arabya`,
  };
}

export default async function AyahIrabPage({ params }: Props) {
  const { surah, verse } = await params;
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

  const [content, irab, meta, mushaf] = await Promise.all([
    getSurah(surahId),
    getIrab(surahId),
    getSurahMeta(surahId),
    getMushafIndex(),
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

  return (
    <div className="shell page-block ayah-irab-page">
      <nav className="surah-nav" aria-label="تنقل الآية">
        <Link href="/" className="nav-pill">
          الفهرس
        </Link>
        {pageNum ? (
          <Link
            href={`${getMushafPageHref(Number(pageNum))}?v=${surahId}:${verseNumber}`}
            className="nav-pill"
          >
            المصحف
          </Link>
        ) : null}
        <Link href={`/surah/${surahId}/read`} className="nav-pill">
          قراءة السورة
        </Link>
      </nav>

      <header className="ayah-irab-head">
        <h1>
          إعراب {getSurahUthmaniTitle(surahId)}{" "}
          {toArabicNumerals(verseNumber)}
        </h1>
        <p className="ayah-irab-text">
          {ayah.words
            .filter((w) => !w.charType || w.charType === "word")
            .map((w) => normalizeForHafsFont(w.text))
            .join(" ")}
        </p>
        <p className="layer-source">
          المصدر: المدونة القرآنية العربية (QAC) — إعراب نثري مولَّد من الصرف المفتوح
        </p>
      </header>

      <ol className="ayah-irab-list">
        {ayah.words
          .filter((w) => !w.charType || w.charType === "word")
          .map((w) => {
            const morph = irabVerse?.words.find((x) => x.position === w.position);
            return (
              <li key={w.position} className="ayah-irab-item">
                <span className="ayah-irab-word">
                  {normalizeForHafsFont(w.text)}
                </span>
                <span className="ayah-irab-detail">
                  {narrativeIrab(morph ?? null)}
                </span>
                {w.meaningAr ? (
                  <span className="ayah-irab-sense">{w.meaningAr}</span>
                ) : null}
              </li>
            );
          })}
      </ol>
    </div>
  );
}
