import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSurah, getSurahMeta } from "@/lib/quran";
import { getMushafPageHref, toArabicNumerals } from "@/lib/format";
import { normalizeForHafsFont } from "@/lib/quran-text";
import { getSurahUthmaniTitle } from "@/lib/surah-names";
import { getMushafIndex } from "@/lib/mushaf";
import { SurahOrnamentTitle } from "@/components/SurahOrnamentTitle";
import { StudyVerseButton } from "@/components/StudyVerseButton";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const sid = Number(id);
  if (!Number.isInteger(sid)) return { title: "دراسة سورة" };
  return {
    title: `دراسة ${getSurahUthmaniTitle(sid)} · Arabya`,
    description: `نص سورة ${getSurahUthmaniTitle(sid)} كاملًا مع روابط للدراسة والإعراب`,
  };
}

export default async function SurahReadPage({ params }: Props) {
  const { id } = await params;
  const surahId = Number(id);
  if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) notFound();

  const [surah, meta, mushaf] = await Promise.all([
    getSurah(surahId),
    getSurahMeta(surahId),
    getMushafIndex(),
  ]);
  if (!surah || !meta) notFound();

  const firstPage = mushaf.surahFirstPage[String(surahId)] ?? 1;

  return (
    <div className="shell page-block surah-read-page">
      <nav className="surah-nav">
        <Link href="/" className="nav-pill">
          الفهرس
        </Link>
        <Link href={getMushafPageHref(firstPage)} className="nav-pill">
          المصحف
        </Link>
      </nav>

      <header className="surah-read-head">
        <SurahOrnamentTitle title={getSurahUthmaniTitle(surahId)} />
        <p>
          {meta.revelationLabel} · {toArabicNumerals(meta.versesCount)} آية ·{" "}
          {meta.juzLabel}
        </p>
      </header>

      <div className="surah-read-body">
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
              <div className="surah-read-ayah-text">
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
                  إعراب الآية
                </Link>
                <Link
                  href={`${getMushafPageHref(v.page || firstPage)}?v=${surahId}:${v.verseNumber}`}
                  className="nav-pill"
                >
                  قراءة في المصحف
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
