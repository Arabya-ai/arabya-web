import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRootEntry } from "@/lib/quran";
import { getMushafPageHref, toArabicNumerals } from "@/lib/format";
import { getSurahUthmaniTitle } from "@/lib/surah-names";
import { getMushafIndex } from "@/lib/mushaf";

type Props = { params: Promise<{ root: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { root } = await params;
  const decoded = decodeURIComponent(root);
  return {
    title: `الجذر ${decoded}`,
    description: `مواضع الجذر «${decoded}» في القرآن — Arabya`,
  };
}

export default async function RootPage({ params }: Props) {
  const { root } = await params;
  const decoded = decodeURIComponent(root);
  const entry = await getRootEntry(decoded);
  if (!entry) notFound();

  const mushaf = await getMushafIndex();
  const pageOf = (surahId: number, verse: number): number => {
    const pages = mushaf.surahPages?.[String(surahId)] ?? [];
    for (const p of pages) {
      const verses = mushaf.pages?.[String(p)] ?? [];
      if (
        verses.some((v) => v.surahId === surahId && v.verseNumber === verse)
      ) {
        return p;
      }
    }
    return mushaf.surahFirstPage?.[String(surahId)] ?? 1;
  };

  return (
    <div className="shell page-block root-page">
      <nav className="surah-nav" aria-label="تنقل">
        <Link href="/" className="nav-pill">
          ← الفهرس
        </Link>
      </nav>

      <h1>الجذر: {entry.root}</h1>
      <p className="root-meta">
        {toArabicNumerals(entry.count)} موضعًا في القرآن
        {entry.occurrences.length < entry.count
          ? ` · تُعرض عيّنة من ${toArabicNumerals(entry.occurrences.length)} موضعًا`
          : ""}
      </p>

      <ul className="root-list">
        {entry.occurrences.map((o) => {
          const page = pageOf(o.surahId, o.verse);
          return (
            <li key={o.wordId}>
              <Link
                href={`${getMushafPageHref(page)}#s${o.surahId}-v-${o.verse}`}
              >
                <span className="root-surface">{o.surface}</span>
                <span className="root-ref">
                  {getSurahUthmaniTitle(o.surahId)}{" "}
                  {toArabicNumerals(o.verse)}:{toArabicNumerals(o.position)}
                  {o.lemma ? ` · ${o.lemma}` : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
