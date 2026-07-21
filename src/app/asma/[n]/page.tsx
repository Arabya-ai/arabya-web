import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toArabicNumerals } from "@/lib/format";
import { getAsmaByNumber } from "@/lib/asma";

type Props = { params: Promise<{ n: string }> };

function plainEn(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const num = Number((await params).n);
  const entry = Number.isInteger(num) ? await getAsmaByNumber(num) : null;
  if (!entry) return { title: "اسم من الأسماء الحسنى" };
  return {
    title: `${entry.nameAr} · الأسماء الحسنى`,
    description: entry.meaningAr || entry.explanationAr,
  };
}

export async function generateStaticParams() {
  return Array.from({ length: 99 }, (_, i) => ({ n: String(i + 1) }));
}

export default async function AsmaDetailPage({ params }: Props) {
  const num = Number((await params).n);
  if (!Number.isInteger(num) || num < 1 || num > 99) notFound();
  const entry = await getAsmaByNumber(num);
  if (!entry) notFound();

  const prev = num > 1 ? num - 1 : null;
  const next = num < 99 ? num + 1 : null;
  const detailsEn = entry.detailsEn ? plainEn(entry.detailsEn) : "";

  return (
    <div className="shell page-block asma-detail">
      <nav className="surah-nav" aria-label="تنقل">
        <Link href="/asma" className="nav-pill">
          ← كل الأسماء
        </Link>
        <Link href="/" className="nav-pill">
          الفهرس
        </Link>
      </nav>

      <header className="asma-detail-head">
        <p className="asma-detail-num">{toArabicNumerals(entry.number)}</p>
        <h1>{entry.nameAr}</h1>
        <p className="asma-detail-trans">{entry.transliteration}</p>
      </header>

      <section className="asma-detail-card" aria-labelledby="asma-meaning">
        <h2 id="asma-meaning">المعنى · Meaning</h2>
        {entry.meaningAr ? (
          <p className="asma-bilingual-ar">{entry.meaningAr}</p>
        ) : null}
        {entry.meaningEn ? (
          <p className="asma-bilingual-en" lang="en" dir="ltr">
            {entry.meaningEn}
          </p>
        ) : null}
      </section>

      <section className="asma-detail-card" aria-labelledby="asma-expl">
        <h2 id="asma-expl">الشرح والدلالة · Explanation</h2>
        {entry.explanationAr ? (
          <p className="asma-bilingual-ar">{entry.explanationAr}</p>
        ) : null}
        {detailsEn ? (
          <p className="asma-bilingual-en asma-detail-en-body" lang="en" dir="ltr">
            {detailsEn}
          </p>
        ) : null}
      </section>

      <nav className="asma-detail-pager" aria-label="تنقل بين الأسماء">
        {prev ? (
          <Link href={`/asma/${prev}`} className="nav-pill">
            ← السابق
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/asma/${next}`} className="nav-pill">
            التالي →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
