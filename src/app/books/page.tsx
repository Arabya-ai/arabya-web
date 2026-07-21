import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "كتب الإعراب",
  description: "مؤجّل — فهرس كتب الإعراب يُفعَّل بعد اكتمال الاستيراد",
};

/** Catalog UI deferred — see docs/DEVELOPMENT.md */
export default function BooksIndexPage() {
  return (
    <div className="shell page-block">
      <h1>كتب الإعراب</h1>
      <p>
        هذا القسم مؤجّل مؤقتًا حتى استكمال استيراد الكتب. التفاصيل في{" "}
        <code>docs/DEVELOPMENT.md</code>.
      </p>
      <p>
        <Link href="/mushaf/1">العودة للمصحف</Link>
      </p>
    </div>
  );
}
