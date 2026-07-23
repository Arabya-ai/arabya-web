import Link from "next/link";
import type { Metadata } from "next";
import { getBookCatalog } from "@/lib/books";

export const metadata: Metadata = {
  title: "كتب الإعراب",
  description: "فهرس كتب الإعراب — الجاهز والمتاح بعد الاستيراد المرخّص",
};

function statusLabel(status: string | undefined): string {
  if (status === "ready") return "جاهز";
  if (status === "review") return "قيد المراجعة";
  return "بانتظار ترخيص / ملف";
}

export default async function BooksIndexPage() {
  const books = await getBookCatalog();

  return (
    <div className="shell page-block">
      <h1>كتب الإعراب</h1>
      <p>
        يعرض الفهرس حالة كل كتاب. المحتوى الجاهز يظهر بعد استيراد ملف مسموح
        للمشروع. الإعراب الافتراضي في المصحف لا يتغيّر تلقائيًا.
      </p>

      {books.length ? (
        <ul className="books-catalog">
          {books.map((b) => (
            <li key={b.id} className="books-catalog-item">
              <div>
                <strong>{b.title || b.label}</strong>
                <p className="books-catalog-status">
                  الحالة: {statusLabel(b.status)}
                </p>
                {b.description ? (
                  <p className="books-catalog-desc">{b.description}</p>
                ) : null}
              </div>
              {b.status === "ready" ? (
                <Link href={`/books/${b.id}`}>فتح</Link>
              ) : (
                <span className="books-catalog-muted">غير متاح بعد</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>لا توجد مداخل في الفهرس حاليًا.</p>
      )}

      <p className="continue-reading">
        <Link href="/mushaf/1" className="continue-link">
          العودة للمصحف
        </Link>
      </p>
    </div>
  );
}
