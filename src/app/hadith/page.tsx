import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الأحاديث · Arabya",
  description: "مرحلة لاحقة — تحليل كلمة بكلمة للأحاديث الشريفة",
};

export default function HadithHubPage() {
  return (
    <div className="shell page-block">
      <h1>الأحاديث الشريفة</h1>
      <p>
        المرحلة التالية بعد تثبيت طبقات تحليل القرآن الست: نفس محرّك الكلمة وWord
        IDs وClaims على متون الحديث (استيراد مرخّص فقط).
      </p>
      <p className="layer-soon">
        التوثيق: <code>docs/spec/entities-hadith-heritage.md</code>
      </p>
      <p>
        <Link href="/">الفهرس</Link>
      </p>
    </div>
  );
}
