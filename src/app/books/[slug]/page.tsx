import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBookMeta } from "@/lib/books";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookMeta(slug);
  return {
    title: book ? `${book.title || book.label} · Arabya` : "كتاب إعراب",
  };
}

export default async function BookViewerPage({ params }: Props) {
  const { slug } = await params;
  const book = await getBookMeta(slug);
  if (!book) notFound();

  return (
    <div className="shell page-block">
      <nav className="surah-nav">
        <Link href="/books" className="nav-pill">
          ← كتب الإعراب
        </Link>
      </nav>
      <h1>{book.title || book.label}</h1>
      {book.status !== "ready" ? (
        <div className="book-awaiting">
          <p>
            هذا الكتاب <strong>بانتظار ملف مرخّص</strong> من المالك. عند الاستلام
            سيُعرض المتن هنا ويُربط بآيات المصحف عبر Word IDs.
          </p>
          <p className="layer-source">
            انظر التوثيق: <code>docs/platform/books-irab.md</code>
          </p>
        </div>
      ) : (
        <p>المحتوى جاهز للعرض (لم يُرفع بعد في هذه النسخة).</p>
      )}
    </div>
  );
}
