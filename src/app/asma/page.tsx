import type { Metadata } from "next";
import Link from "next/link";
import { toArabicNumerals } from "@/lib/format";
import { getAsmaNames } from "@/lib/asma";

export const metadata: Metadata = {
  title: "الأسماء الحسنى",
  description: "أسماء الله الحسنى التسعة والتسعون مع المعنى والشرح — عربية",
};

export default async function AsmaPage() {
  const names = await getAsmaNames();

  return (
    <div className="shell page-block asma-page">
      <nav className="surah-nav" aria-label="تنقل">
        <Link href="/" className="nav-pill">
          ← الفهرس
        </Link>
      </nav>

      <header className="asma-page-head">
        <h1>الأسماء الحسنى</h1>
        <p>{toArabicNumerals(names.length || 99)} اسمًا — اضغط أي اسم للتفاصيل</p>
      </header>

      {names.length === 0 ? (
        <p className="empty-state">تعذّر تحميل القائمة حاليًا.</p>
      ) : (
        <ul className="asma-grid">
          {names.map((n) => (
            <li key={n.number}>
              <Link href={`/asma/${n.number}`} className="asma-grid-link">
                <span className="asma-grid-num">
                  {toArabicNumerals(n.number)}
                </span>
                <span className="asma-grid-name">{n.nameAr}</span>
                <span className="asma-grid-trans">{n.transliteration}</span>
                {n.meaningAr ? (
                  <span className="asma-grid-meaning">{n.meaningAr}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
