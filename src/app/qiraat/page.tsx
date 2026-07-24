import Link from "next/link";
import type { Metadata } from "next";
import { readFile } from "fs/promises";
import path from "path";

export const metadata: Metadata = {
  title: "القراءات",
  description: "الروايات والقراءات في عربية — حفص متاح؛ الباقي بعد الترخيص",
};

export const dynamic = "force-dynamic";

type Reading = {
  slug: string;
  nameAr: string;
  status: "ready" | "awaiting_license";
  note: string;
};

async function loadReadings(): Promise<Reading[]> {
  try {
    const raw = await readFile(
      path.join(process.cwd(), "data", "qiraat", "index.json"),
      "utf8",
    );
    const data = JSON.parse(raw) as { readings?: Reading[] };
    return Array.isArray(data.readings) ? data.readings : [];
  } catch {
    return [];
  }
}

export default async function QiraatPage() {
  const readings = await loadReadings();

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
            <strong>{r.nameAr}</strong>
            <span className="qiraat-status">
              {r.status === "ready" ? "متاح" : "بانتظار ترخيص"}
            </span>
            <p>{r.note}</p>
          </li>
        ))}
      </ul>
      <p>
        <Link href="/mushaf/1">فتح مصحف حفص</Link>
      </p>
    </div>
  );
}
