import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "القراءات",
  description: "الرواية المعتمدة في عربية — حفص عن عاصم",
};

export default function QiraatPage() {
  return (
    <div className="shell page-block">
      <h1>القراءات والروايات</h1>
      <p>
        النص المعتمد حاليًا في عربية هو <strong>حفص عن عاصم</strong> برسم مصحف
        المدينة (QPC). إضافة روايات أخرى مؤجّلة حتى اكتمال البيانات.
      </p>
      <ul className="qiraat-list">
        <li className="is-ready">حفص عن عاصم — متاح في المصحف</li>
      </ul>
      <p>
        <Link href="/mushaf/1">فتح المصحف</Link>
      </p>
    </div>
  );
}
