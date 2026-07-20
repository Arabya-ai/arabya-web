import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "موارد · Arabya",
  description: "إذاعة ومصاحف PDF وروابط عامة لخدمة كتاب الله",
};

const PDF_LINKS = [
  {
    label: "مصحف المدينة (مجمّع الملك فهد) — صفحة المجمع",
    href: "https://qurancomplex.gov.sa/",
  },
  {
    label: "تنزيلات مصاحف من Quran.com",
    href: "https://quran.com",
  },
];

export default function ResourcesPage() {
  return (
    <div className="shell page-block">
      <h1>موارد</h1>

      <section className="resource-block">
        <h2>إذاعة القرآن</h2>
        <p>
          بث مباشر من إذاعة القرآن الكريم من القاهرة (رابط خارجي — لا نستضيف
          الصوت):
        </p>
        <p>
          <a
            href="https://stream.radiojar.com/8s5u5tpdtwzuv"
            target="_blank"
            rel="noreferrer"
            className="nav-pill"
          >
            تشغيل البث
          </a>
        </p>
      </section>

      <section className="resource-block">
        <h2>تحميل مصاحف PDF</h2>
        <p>
          نربط بمصادر عامة مرخّصة أو رسمية. لا نعيد رفع مصاحف محمية من مواقع
          أخرى.
        </p>
        <ul>
          {PDF_LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="resource-block">
        <h2>روايات وتجويد ملون</h2>
        <p className="layer-soon">
          طبقة الروايات المتعددة (ورش، قالون…) ومصحف التجويد الملون تُفعَّل عند
          توفر بيانات QPC مرخّصة — انظر <Link href="/qiraat">القراءات</Link>.
        </p>
      </section>

      <p>
        <Link href="/">العودة للفهرس</Link>
      </p>
    </div>
  );
}
