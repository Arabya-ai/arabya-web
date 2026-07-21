import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "عن عربية",
  description:
    "عربية منصة لدراسة القرآن كلمة بكلمة: مصحف، إعراب، جذور، تفاسير، ترجمات، دراسة سريعة، وأدوات يومية — مصادر مفتوحة ومنسوبة.",
};

export default function AboutPage() {
  return (
    <div className="shell privacy-page page-block legal-page">
      <h1>عن عربية</h1>
      <p className="legal-lead">
        <strong>عربية</strong> منصة عربية (RTL) لدراسة النص القرآني{" "}
        <strong>كلمةً بكلمة</strong>: نحو وصرف ومعجم ودلالة وترجمة وتفسير، مع
        إسناد واضح لكل طبقة بيانات. الموقع منشور على{" "}
        <a href="https://www.arabyaai.com" rel="noreferrer">
          www.arabyaai.com
        </a>
        .
      </p>

      <section aria-labelledby="about-vision">
        <h2 id="about-vision">الرؤية</h2>
        <p>
          عربية ليست مجرد «مصحف + تفسير». هي نواة لمحرك تحليل نص عربي على مستوى
          الكلمة، يُطبَّق اليوم على القرآن، ويُمدَّ لاحقًا — بعد اكتمال طبقات
          القرآن — إلى الحديث ثم الشعر والتراث من مصادر مرخّصة فقط. كل طبقة
          تحليلية تحتاج مصدرًا صريحًا؛ ولا نعيد نشر محتوى محمي من مواقع منافسة.
        </p>
      </section>

      <section aria-labelledby="about-features">
        <h2 id="about-features">ماذا تجد في الموقع اليوم</h2>

        <h3>القراءة والمصحف</h3>
        <ul>
          <li>
            <Link href="/">فهرس السور</Link> مع بحث فوري في نص الآيات والجذور،
            ومفضّلات محلية، ومتابعة آخر موضع قراءة.
          </li>
          <li>
            <Link href="/mushaf/1">مصحف المدينة</Link> (صفحات ١–٦٠٤) بعرض كلمة
            بكلمة، تكبير الخط، مشاركة، مفضّلات، ووضع ليلي.
          </li>
          <li>
            <Link href="/juz">فهرس الأجزاء</Link> الثلاثين، وقراءة السورة كاملة
            مع روابط الدراسة والإعراب.
          </li>
          <li>
            تلاوة الآية والكلمة (EveryAyah / مصادر الصوت المعتمدة في الواجهة)
            مع اختيار القارئ وتكرار الآية حيث يتيسر.
          </li>
        </ul>

        <h3>دراسة الكلمة والآية</h3>
        <ul>
          <li>
            لوحة دراسة الكلمة في المصحف بطبقات:{" "}
            <strong>إعراب</strong> · <strong>معجم/صرف وجذر</strong> ·{" "}
            <strong>ترجمة ودلالة</strong> · <strong>تفسير</strong>.
          </li>
          <li>
            صفحة <Link href="/ayah/1/1">إعراب الآية</Link> كلمة بكلمة.
          </li>
          <li>
            <Link href="/study">دراسة سريعة</Link> على الصفحة الرئيسية وصفحة
            مستقلة: استعلام فوري مع ملخص محلي ومواضع مرتبطة (معنى + صرف +
            الميسّر).
          </li>
        </ul>

        <h3>الجذور والمعجم</h3>
        <ul>
          <li>
            <Link href="/roots">فهرس الجذور الصرفية</Link> (١٬٦٥١ جذرًا وفق مدونة
            Quranic Arabic Corpus) مع مسار لأكثر الجذور ورودًا.
          </li>
          <li>
            صفحة كل جذر: المصدر، المشتقات (lemma) ومعاني عربية عند توفرها، وجميع
            المواضع في القرآن مع ربط للمصحف.
          </li>
        </ul>

        <h3>البوابة والأدوات</h3>
        <ul>
          <li>
            <Link href="/asma">الأسماء الحسنى</Link>: بطاقة يومية وفهرس وصفحات
            تفصيل بالمعنى والشرح بالعربية والإنجليزية.
          </li>
          <li>
            مواقيت الصلاة والقبلة (مع عدّاد الصلاة التالية) وعادة القراءة اليومية
            (هدف يومي، سلسلة، تقدّم الختم) على الصفحة الرئيسية.
          </li>
          <li>
            <Link href="/books">كتب الإعراب</Link> — البنية جاهزة وتُعرض المحتويات
            بعد تسليم ملفات مرخّصة من أصحابها.
          </li>
          <li>
            <Link href="/resources">موارد</Link> وروابط عامة، ومسار للقراءات
            (حفص أساسًا في المرحلة الحالية).
          </li>
        </ul>
      </section>

      <section aria-labelledby="about-sources">
        <h2 id="about-sources">مصادر البيانات</h2>
        <p>نعتمد مصادرًا مفتوحة أو مرخّصة مع ذكر المصدر:</p>
        <ul>
          <li>
            <a href="https://quran.com" rel="noreferrer" target="_blank">
              Quran.com
            </a>{" "}
            — نص QPC حفص، ترجمات الآيات، ومعاني كلمة بكلمة (إنجليزي وغيرها)،
            والتفاسير المعتمدة في الواجهة.
          </li>
          <li>
            <a href="http://corpus.quran.com" rel="noreferrer" target="_blank">
              Quranic Arabic Corpus
            </a>{" "}
            — الصرف والإعراب المنظَّم والجذور (ترخيص GPL مع الإسناد).
          </li>
          <li>
            معجم مواد عربي محلّي لعربْية (`lemma-sense-ar`) لمعانٍ دراسية قصيرة —
            ليس إعادة نشر لكتب أو مواقع معاجم محمية.
          </li>
          <li>محتوى الأسماء الحسنى والمعاني العربية المنسوبة في بيانات المشروع.</li>
        </ul>
        <p>
          المحتوى القرآني الثابت يُدار بأسلوب <strong>Git-first</strong> (ملفات
          JSON في المستودع) ليبقى شفافًا وقابلاً للتتبع مع كل إصدار.
        </p>
      </section>

      <section aria-labelledby="about-tech">
        <h2 id="about-tech">التقنية والنشر</h2>
        <ul>
          <li>واجهة: Next.js وTypeScript، تجربة عربية كاملة (RTL).</li>
          <li>
            المستودع:{" "}
            <a
              href="https://github.com/Arabya-ai/arabya-web"
              rel="noreferrer"
              target="_blank"
            >
              Arabya-ai/arabya-web
            </a>
            .
          </li>
          <li>النشر عبر Vercel على النطاق الحالي arabyaai.com.</li>
        </ul>
      </section>

      <section aria-labelledby="about-roadmap">
        <h2 id="about-roadmap">ما هو مؤجّل عمدًا</h2>
        <ul>
          <li>طبقة البلاغة وClaims متعددة الآراء عند توفر مصادر مرخّصة إضافية.</li>
          <li>كتب إعراب ومعاجم كلاسيكية بعد الترخيص الخطي.</li>
          <li>حسابات سحابية ومزامنة بين الأجهزة (مخطط D1 لاحقًا).</li>
          <li>
            محاور الحديث والتراث والشعر — بعد ترسيخ طبقات كلمة القرآن في الواجهة.
          </li>
          <li>نطاق arabya.ai بعد اكتمال المنتج الأساسي على arabyaai.com.</li>
        </ul>
      </section>

      <section aria-labelledby="about-contact">
        <h2 id="about-contact">التواصل</h2>
        <p>
          للاستفسارات التقنية أو المقترحات: منظمة{" "}
          <a
            href="https://github.com/Arabya-ai"
            rel="noreferrer"
            target="_blank"
          >
            Arabya-ai
          </a>{" "}
          على GitHub. راجع أيضًا{" "}
          <Link href="/privacy">سياسة الخصوصية</Link>.
        </p>
      </section>
    </div>
  );
}
