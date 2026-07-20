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
        المعنى العربي للكلمة مبني على{" "}
        <strong>معجم مواد عربْية</strong> (معاني دلالية قصيرة مرتبطة بمواد
        المدونة القرآنية العربية)، مع احتياطي صرفي عند غياب المعنى. ليس إعادة
        نشر لترجمة عربية كلمة بكلمة من طرف ثالث.
      </p>
      <p>
        «دراسة سريعة» على الصفحة الرئيسية تُنتج ملخصاً محلياً من المعنى +
        الإعراب + مقتطف التفسير الميسّر، دون استدعاء نموذج لغوي.
      </p>
      <p>
        الموقع يعمل على www.arabyaai.com، وربط arabya.ai بعد اكتمال المشروع.
      </p>
    </div>
  );
}
