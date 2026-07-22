import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRootEntry } from "@/lib/quran";
import { toArabicNumerals } from "@/lib/format";
import { getMushafIndex } from "@/lib/mushaf";
import { getLemmaSenseFile, summarizeRootLemmas } from "@/lib/roots";
import { RootOccurrencesList } from "@/components/RootOccurrencesList";
import { PageShareButton } from "@/components/PageShareButton";
import { buildSocialMetadata, rootOgImagePath } from "@/lib/og-meta";

type Props = { params: Promise<{ root: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { root } = await params;
  const decoded = decodeURIComponent(root);
  const title = `الجذر ${decoded}`;
  const description = `مواضع الجذر «${decoded}» في القرآن — Arabya`;
  const social = buildSocialMetadata({
    title,
    description,
    url: `/root/${encodeURIComponent(decoded)}`,
    imageUrl: rootOgImagePath(decoded),
  });
  return {
    title,
    description,
    ...social,
  };
}

export default async function RootPage({ params }: Props) {
  const { root } = await params;
  const decoded = decodeURIComponent(root);
  const entry = await getRootEntry(decoded);
  if (!entry) notFound();

  const [mushaf, senseFile] = await Promise.all([
    getMushafIndex(),
    getLemmaSenseFile(),
  ]);

  const pageOf: Record<string, number> = {};
  for (const occ of entry.occurrences) {
    const key = `${occ.surahId}:${occ.verse}`;
    if (pageOf[key]) continue;
    const pages = mushaf.surahPages?.[String(occ.surahId)] ?? [];
    let page = mushaf.surahFirstPage?.[String(occ.surahId)] ?? 1;
    for (const p of pages) {
      const verses = mushaf.pages?.[String(p)] ?? [];
      if (
        verses.some(
          (v) => v.surahId === occ.surahId && v.verseNumber === occ.verse,
        )
      ) {
        page = p;
        break;
      }
    }
    pageOf[key] = page;
  }

  const lemmas = summarizeRootLemmas(entry, senseFile?.senses);

  return (
    <div className="shell page-block root-page">
      <nav className="surah-nav" aria-label="تنقل">
        <Link href="/roots" className="nav-pill">
          ← فهرس الجذور
        </Link>
        <Link href="/" className="nav-pill">
          الفهرس
        </Link>
      </nav>

      <h1>الجذر: {entry.root}</h1>
      <p className="root-meta">
        {toArabicNumerals(entry.count)} موضعًا في القرآن
      </p>
      <div className="root-share-row">
        <PageShareButton
          title={`Arabya — الجذر ${entry.root}`}
          text={`مواضع الجذر «${entry.root}» في القرآن (${entry.count} موضعًا)`}
          path={`/root/${encodeURIComponent(entry.root)}`}
          label="مشاركة الجذر"
        />
      </div>

      {lemmas.length ? (
        <section className="root-lemmas" aria-labelledby="root-lemmas-h">
          <h2 id="root-lemmas-h">المشتقات</h2>
          <p className="root-lemmas-lead">
            صيغ مرتبطة بهذا الجذر في المدونة.
          </p>
          <ul className="root-lemma-list">
            {lemmas.slice(0, 40).map((L) => (
              <li key={L.lemma}>
                <span className="root-lemma-form">{L.lemma}</span>
                <span className="root-lemma-count">
                  {toArabicNumerals(L.count)}
                </span>
                {L.sense ? (
                  <span className="root-lemma-sense">
                    {L.sense}
                    {L.senseSource ? (
                      <span className="root-lemma-src"> · {L.senseSource}</span>
                    ) : null}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          {lemmas.length > 40 ? (
            <p className="root-lemmas-more">
              و{toArabicNumerals(lemmas.length - 40)} مشتقًا إضافيًا في المواضع
              أدناه.
            </p>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="root-occ-h">
        <h2 id="root-occ-h">المواضع في القرآن</h2>
        <RootOccurrencesList
          root={entry.root}
          occurrences={entry.occurrences}
          pageOf={pageOf}
        />
      </section>
    </div>
  );
}
