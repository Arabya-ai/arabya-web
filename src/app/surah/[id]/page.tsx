import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SurahReader } from "@/components/SurahReader";
import { getSurah, getSurahMeta, getSurahs } from "@/lib/quran";

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  const surahs = await getSurahs();
  return surahs.map((s) => ({ id: String(s.id) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const meta = await getSurahMeta(Number(id));
  if (!meta) return { title: "سورة" };
  return {
    title: `سورة ${meta.nameArabic}`,
    description: `تفسير كلمات سورة ${meta.nameArabic} — Arabya.ai`,
  };
}

export default async function SurahPage({ params }: Props) {
  const { id } = await params;
  const surahId = Number(id);
  if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) notFound();

  const [meta, content] = await Promise.all([
    getSurahMeta(surahId),
    getSurah(surahId),
  ]);

  if (!meta || !content) notFound();

  const prev = surahId > 1 ? surahId - 1 : null;
  const next = surahId < 114 ? surahId + 1 : null;

  return (
    <div className="shell page-block">
      <div className="surah-hero">
        <p className="hero-kicker">Arabya.ai</p>
        <h1>سورة {meta.nameArabic}</h1>
        <div className="surah-meta">
          <span className="meta-pill">{meta.juzLabel}</span>
          <span className="meta-pill">{meta.revelationLabel}</span>
          <span className="meta-pill">{meta.versesCount} آية</span>
        </div>
      </div>

      <nav className="surah-nav" aria-label="تنقل السور">
        {prev ? (
          <Link href={`/surah/${prev}`}>← السورة السابقة</Link>
        ) : (
          <span />
        )}
        <Link href="/">الفهرس</Link>
        {next ? (
          <Link href={`/surah/${next}`}>السورة التالية →</Link>
        ) : (
          <span />
        )}
      </nav>

      <SurahReader verses={content.verses} />
    </div>
  );
}
