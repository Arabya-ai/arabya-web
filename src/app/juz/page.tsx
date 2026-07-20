import Link from "next/link";
import type { Metadata } from "next";
import { getMushafPageHref, toArabicNumerals } from "@/lib/format";
import { JUZ_FIRST_PAGE, juzLabel } from "@/lib/juz";

export const metadata: Metadata = {
  title: "أجزاء المصحف · Arabya",
  description: "فهرس أجزاء القرآن الكريم الثلاثين — مصحف المدينة",
};

export default function JuzIndexPage() {
  const items = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className="shell page-block">
      <h1>أجزاء المصحف</h1>
      <p className="table-intro">انتقل مباشرة إلى أول صفحة من كل جزء في مصحف المدينة.</p>
      <ul className="juz-grid">
        {items.map((j) => (
          <li key={j}>
            <Link
              href={getMushafPageHref(JUZ_FIRST_PAGE[j])}
              className="juz-card"
            >
              <span className="juz-num">{toArabicNumerals(j)}</span>
              <span className="juz-name">{juzLabel(j)}</span>
              <span className="juz-page">
                ص {toArabicNumerals(JUZ_FIRST_PAGE[j])}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
