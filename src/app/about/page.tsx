import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "عن Arabya",
};

export default function AboutPage() {
  return (
    <div className="shell privacy-page page-block">
      <h1>عن Arabya</h1>
      <p>
        Arabya منصة عربية لدراسة القرآن كلمةً بكلمة: معاني مختصرة، إعراب
        صرفي، وترجمات وتفاسير يمكن التبديل بينها من الواجهة.
      </p>
      <p>
        نعتمد مصادر مفتوحة فقط:
      </p>
      <ul>
        <li>
          نص القرآن ومعاني الكلمات (إنجليزي / إندونيسي / أردو) وترجمات الآيات
          والتفاسير عبر{" "}
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
        المعنى العربي للكلمة يُعرض حالياً كمعنى دراسي تقريبي مشتق من المادة
        الصرفية (lemma)، مع تنويه في الواجهة، إلى أن يتوفر مصدر عربي مرخّص
        للتوزيع.
      </p>
      <p>
        الموقع يعمل على www.arabyaai.com، وربط arabya.ai بعد اكتمال المشروع.
      </p>
    </div>
  );
}
