import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "التراث والشعر · Arabya",
  description: "مرحلة بعيدة — تحليل كلمة بكلمة للتراث من المكتبة الشاملة",
};

export default function HeritageHubPage() {
  return (
    <div className="shell page-block">
      <h1>الشعر والتراث</h1>
      <p>
        بعد القرآن والحديث: استيراد مرخّص من المكتبة الشاملة وتحليل كل كلمة بنفس
        الطبقات (صرف · نحو · دلالة · بلاغة · معجم · ترجمة).
      </p>
      <p className="layer-soon">لا سكرابينج بلا إذن — الملفات تُسلَّم مرخّصة فقط.</p>
      <p>
        <Link href="/hadith">الأحاديث</Link> · <Link href="/">الفهرس</Link>
      </p>
    </div>
  );
}
