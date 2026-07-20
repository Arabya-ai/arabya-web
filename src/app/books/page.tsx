import Link from "next/link";
import type { Metadata } from "next";
import { getBookCatalog } from "@/lib/books";

export const metadata: Metadata = {
  title: "كتب الإعراب · Arabya",
  description: "فهرس كتب إعراب القرآن — مصادر مفتوحة الآن وكتب مرخّصة عند التوفر",
};

export default async function BooksIndexPage() {
  const books = await getBookCatalog();

  return (
    <div className="shell page-block">
      <h1>كتب الإعراب</h1>
      <p className="table-intro">
        فهرس كتب إعراب القرآن. الكتب أدناه تُدمج بعد تسليم ملفات مرخّصة — بلا
        سكرابينج من مواقع أخرى.
      </p>
      <ul className="books-list">
        {books.map((b) => (
          <li key={b.id}>
            <Link href={`/books/${b.id}`} className="books-card">
              <strong>{b.title || b.label}</strong>
              <span className={`books-status books-status--${b.status}`}>
                {b.status === "ready" ? "متاح" : "بانتظار الترخيص"}
              </span>
              {b.description ? <p>{b.description}</p> : null}
            </Link>
          </li>
        ))}
      </ul>
      <p>
        <Link href="/mushaf/1">العودة للمصحف</Link>
      </p>
    </div>
  );
}
