import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRootEntry } from "@/lib/quran";
import { toArabicNumerals } from "@/lib/format";
import { getMushafIndex } from "@/lib/mushaf";
import { getLemmaSenseFile, summarizeRootLemmas } from "@/lib/roots";
import { RootOccurrencesList } from "@/components/RootOccurrencesList";

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
  const senseAttr = senseFile?.attribution?.senses ?? "Arabya";

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

      <section className="root-source-card" aria-labelledby="root-source-h">
        <h2 id="root-source-h">المصدر</h2>
        <p>
          الصرف والجذر من{" "}
          <a
            href="http://corpus.quran.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Quranic Arabic Corpus
          </a>{" "}
          (GPL) عبر فرع mustafa0x/quran-morphology. المعاني العربية للمشتقات —
          إن وُجدت — من طبقة عربية ({senseAttr}).
        </p>
      </section>

      <section className="root-claims-card" aria-labelledby="root-claims-h">
        <h2 id="root-claims-h">اختلاف المصادر</h2>
        <p>
          حاليًا يُعرض جذر واحد من المدونة الصرفية أعلاه. عند إضافة معاجم
          مرخّصة (مثل مقاييس اللغة) ستظهر الآراء المختلفة هنا بنموذج Claims مع
          إسناد كل رأي لمصدره — انظر{" "}
          <Link href="/books">كتب الإعراب والمعاجم</Link>.
        </p>
      </section>

      {lemmas.length ? (
        <section className="root-lemmas" aria-labelledby="root-lemmas-h">
          <h2 id="root-lemmas-h">المشتقات (lemma)</h2>
          <p className="root-lemmas-lead">
            صيغ مرتبطة بهذا الجذر في المدونة
            {senseFile
              ? "، مع معنى عربي موجز عند توفره في طبقة المعجم المحلية"
              : ""}
            .
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
