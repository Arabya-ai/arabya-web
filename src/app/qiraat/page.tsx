import Link from "next/link";
import type { Metadata } from "next";
import qiraatIndex from "../../../data/qiraat/index.json";

export const metadata: Metadata = {
  title: "القراءات",
  description: "الروايات والقراءات في عربية — حفص متاح؛ الباقي بعد الترخيص",
};

type Reading = {
  slug: string;
  nameAr: string;
  status: "ready" | "awaiting_license";
  note: string;
};

const readings = (qiraatIndex.readings ?? []) as Reading[];

export default function QiraatPage() {
  return (
    <div className="shell page-block">
      <h1>القراءات والروايات</h1>
      <p>
        النص المعتمد حاليًا هو <strong>حفص عن عاصم</strong> برسم مصحف المدينة
        (QPC). الروايات الإضافية تُدرج هنا عند توفر بيانات مرخّصة — بدون محتوى
        تجريبي.
      </p>
      <ul className="qiraat-list">
        {readings.map((r) => (
          <li
            key={r.slug}
            className={r.status === "ready" ? "is-ready" : "is-pending"}
          >
            <div className="qiraat-row">
              <strong>{r.nameAr}</strong>
              <span className="qiraat-status">
                {r.status === "ready" ? "متاح" : "بانتظار ترخيص"}
              </span>
            </div>
            <p>{r.note}</p>
            {r.status === "ready" ? (
              <p>
                <Link href="/mushaf/1" className="account-panel-link">
                  فتح المصحف (حفص)
                </Link>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      {readings.length === 0 ? (
        <p className="dash-banner dash-banner--warn">
          لم يُحمَّل فهرس القراءات. أعد تحميل الصفحة أو راجع{" "}
          <code>data/qiraat/index.json</code>.
        </p>
      ) : null}
    </div>
  );
}
