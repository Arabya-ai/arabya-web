import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "القراءات · Arabya",
  description: "روايات القرآن المتعددة — جاهزية البنية",
};

export default function QiraatPage() {
  return (
    <div className="shell page-block">
      <h1>القراءات والروايات</h1>
      <p>
        النص الافتراضي في Arabya هو <strong>حفص عن عاصم</strong> (QPC). الروايات
        الأخرى (ورش، قالون، شعبة…) تُضاف كطبقة منفصلة عند توفر بيانات مرخّصة من
        مجمع الملك فهد / مصادر مفتوحة.
      </p>
      <ul className="qiraat-list">
        <li className="is-ready">حفص عن عاصم — متاح (المصحف الحالي)</li>
        <li>شعبة عن عاصم — بانتظار البيانات</li>
        <li>ورش عن نافع — بانتظار البيانات</li>
        <li>قالون عن نافع — بانتظار البيانات</li>
        <li>مصحف التجويد الملون — بانتظار ترخيص بصري</li>
      </ul>
      <p>
        <Link href="/mushaf/1">فتح المصحف</Link> ·{" "}
        <Link href="/resources">الموارد</Link>
      </p>
    </div>
  );
}
