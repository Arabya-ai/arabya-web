import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "عن عربية",
};

export default function AboutPage() {
  return (
    <div className="shell privacy-page page-block">
      <h1>عن عربية</h1>
      <p>
        عربية منصة لدراسة القرآن كلمةً بكلمة: نحو وصرف ودلالة وتفسير وترجمة،
        بمصادر مفتوحة ومنسوبة.
      </p>
      <p>نعتمد مصادر مفتوحة فقط:</p>
      <ul>
        <li>
          نص القرآن ومعاني الكلمات وترجمات الآيات والتفاسير عبر{" "}
          <a href="https://quran.com" rel="noreferrer" target="_blank">
            Quran.com
          </a>
        </li>
        <li>
          الإعراب والصرف من{" "}
          <a href="http://corpus.quran.com" rel="noreferrer" target="_blank">
            Quranic Arabic Corpus
          </a>{" "}
          (ترخيص GPL مع ذكر المصدر)
        </li>
      </ul>
      <p>
        المعنى العربي للكلمة مبني على معجم مواد عربْية مع احتياطي صرفي — ليس
        إعادة نشر لكتب محمية.
      </p>
      <p>
        واجهة عربية (RTL) على Next.js، والبيانات القرآنية تُدار عبر Git (ملفات
        JSON) لتبقى النسخة مجانية ومتاحة.
      </p>
    </div>
  );
}
