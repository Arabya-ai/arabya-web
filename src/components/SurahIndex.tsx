import Link from "next/link";
import type { SurahMeta } from "@/lib/types";

export function SurahTable({ surahs }: { surahs: SurahMeta[] }) {
  return (
    <div className="table-wrap">
      <table className="surah-table">
        <thead>
          <tr>
            <th scope="col">رقم</th>
            <th scope="col">اسم السورة</th>
            <th scope="col">الجزء</th>
            <th scope="col">تصنيفها</th>
            <th scope="col">عدد آياتها</th>
          </tr>
        </thead>
        <tbody>
          {surahs.map((s) => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>
                <Link href={`/surah/${s.id}`} className="surah-link">
                  {s.nameArabic}
                </Link>
              </td>
              <td>{s.juzLabel}</td>
              <td>{s.revelationLabel}</td>
              <td>{s.versesCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SurahGrid({ surahs }: { surahs: SurahMeta[] }) {
  return (
    <section className="surah-grid-section" aria-labelledby="all-surahs">
      <h2 id="all-surahs">جميع سور القرآن الكريم</h2>
      <div className="surah-grid">
        {surahs.map((s) => (
          <Link key={s.id} href={`/surah/${s.id}`} className="surah-chip">
            {s.nameArabic}
          </Link>
        ))}
      </div>
    </section>
  );
}
