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
        صرفي، وتفاسير يمكن التبديل بينها من الواجهة.
      </p>
      <p>
        نعتمد مصادر مفتوحة فقط: نص القرآن وبيانات الكلمات والتفاسير عبر
        Quran.com، والإعراب من المدونة القرآنية العربية (Quranic Arabic Corpus)
        مع ذكر المصدر كما يشترط الترخيص.
      </p>
      <p>
        الموقع قيد التطوير على الدومين arabyaai.com ثم الانتقال إلى arabya.ai.
      </p>
    </div>
  );
}
