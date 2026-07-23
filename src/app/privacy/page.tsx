import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "سياسة الخصوصية",
  description:
    "سياسة خصوصية منصة عربية: الحساب الاختياري، المزامنة السحابية، والبيانات المحلية، وحقوقك.",
};

export default function PrivacyPage() {
  const updated = "٢٣ يوليو ٢٠٢٦";

  return (
    <div className="shell privacy-page page-block legal-page">
      <h1>سياسة الخصوصية</h1>
      <p className="legal-lead">
        تحترم منصة <strong>عربية</strong> (نفس الخدمة على arabyaai.com و
        arabya.website و arabya.org و arabya.ai) خصوصيتك. التصفح ودراسة المصحف
        متاحان <strong>بدون حساب</strong>. الحساب عبر Google اختياري لمزامنة
        بياناتك بين الأجهزة. لا نبيع بيانات شخصية.
      </p>
      <p className="legal-updated">آخر تحديث: {updated}</p>

      <section aria-labelledby="privacy-summary">
        <h2 id="privacy-summary">ملخص سريع</h2>
        <ul>
          <li>لا يلزم تسجيل دخول للقراءة والدراسة.</li>
          <li>
            بدون حساب: المفضّلات والملاحظات وعادة القراءة تبقى{" "}
            <strong>على جهازك فقط</strong> (localStorage).
          </li>
          <li>
            مع حساب Google: قد تُزامَن تلك البيانات مع خزانة سحابية مرتبطة
            ببريدك لتظهر على أجهزتك الأخرى.
          </li>
          <li>
            قد تُسجَّل إحصاءات استخدام مجمّعة عبر أدوات الاستضافة/التحليل
            القياسية (مثل Vercel Analytics).
          </li>
        </ul>
      </section>

      <section aria-labelledby="privacy-accounts">
        <h2 id="privacy-accounts">الحساب الاختياري (Google)</h2>
        <p>
          عند اختيار «تسجيل الدخول» نستخدم Google لتوثيق هويتك. نستلم عادةً:
          الاسم، البريد، وصورة الملف الشخصي. نستخدمها لعرض حسابك وتحديد الدور
          (مشترك / محرر / مدير) ولا نستخدمها للإعلان.
        </p>
        <p>
          جلسة الدخول تُدار عبر ملفات تعريف ارتباط تقنية آمنة من مزوّد المصادقة
          (Auth.js). يمكنك تسجيل الخروج في أي وقت من قائمة «حسابي».
        </p>
      </section>

      <section aria-labelledby="privacy-sync">
        <h2 id="privacy-sync">المزامنة السحابية</h2>
        <p>
          عند تفعيل المزامنة لحساب مسجّل، تُحفَظ نسخة من بياناتك الشخصية التالية
          على بنية تحتية سحابية (حاليًا Cloudflare D1 عبر عامل مزامنة محمي):
        </p>
        <ul>
          <li>المفضّلات وآخر صفحة مصحف / متابعة القراءة.</li>
          <li>عادة القراءة (الهدف، السلسلة، تقدّم الختم).</li>
          <li>ملاحظات الآيات.</li>
        </ul>
        <p>
          الغرض: استعادة بياناتك عند تغيير الجهاز أو المتصفح بعد تسجيل الدخول.
          الزائر بلا حساب لا تُرفع بياناته الشخصية إلى هذه الخزانة. محتوى القرآن
          العام يُقدَّم من ملفات الموقع وليس كملف شخصي لك.
        </p>
      </section>

      <section aria-labelledby="privacy-local">
        <h2 id="privacy-local">ما يبقى على جهازك</h2>
        <p>
          حتى مع الحساب، تبقى نسخة محلية في المتصفح لسرعة الاستخدام، إضافةً إلى
          إعدادات الواجهة (الوضع الليلي، حجم الخط، لغة المعنى، الترجمة، القارئ…).
          يمكنك مسح بيانات الموقع من إعدادات المتصفح.
        </p>
      </section>

      <section aria-labelledby="privacy-server">
        <h2 id="privacy-server">الاستضافة والمزوّدون</h2>
        <ul>
          <li>
            <strong>الموقع:</strong> يُستضاف عبر Vercel؛ قد تتضمن السجلات التقنية
            عناوين IP أو وكيل المتصفح لأغراض الأمان والتشخيص.
          </li>
          <li>
            <strong>المزامنة:</strong> تُعالَج عبر Cloudflare (Workers / D1) عند
            استخدام الحساب.
          </li>
          <li>
            <strong>تسجيل الدخول:</strong> يتم عبر Google؛ راجع سياسة خصوصية
            Google أيضًا.
          </li>
          <li>
            <strong>التحليلات:</strong>{" "}
            <a
              href="https://vercel.com/docs/analytics"
              rel="noreferrer"
              target="_blank"
            >
              Vercel Analytics
            </a>{" "}
            لاطلاع مجمّع على الزيارات والأداء.
          </li>
          <li>
            <strong>وسائط خارجية:</strong> ملفات التلاوة أو بعض الخدمات المساعدة
            قد تُحمَّل من خوادم أطراف ثالثة عند التشغيل.
          </li>
        </ul>
      </section>

      <section aria-labelledby="privacy-cookies">
        <h2 id="privacy-cookies">ملفات تعريف الارتباط</h2>
        <p>
          نستخدم ملفات لازمة للجلسة بعد تسجيل الدخول، إضافةً إلى التخزين المحلي
          للتفضيلات. لا نستخدم إعلانات طرف ثالث لتتبعك عبر المواقع.
        </p>
      </section>

      <section aria-labelledby="privacy-rights">
        <h2 id="privacy-rights">حقوقك وخياراتك</h2>
        <ul>
          <li>التصفح دون حساب.</li>
          <li>تسجيل الخروج ومسح التخزين المحلي من المتصفح.</li>
          <li>
            طلب الاستفسار أو حذف بيانات الحساب المرتبطة بالبريد عبر منظمة{" "}
            <a
              href="https://github.com/Arabya-ai"
              rel="noreferrer"
              target="_blank"
            >
              Arabya-ai
            </a>{" "}
            على GitHub.
          </li>
        </ul>
      </section>

      <section aria-labelledby="privacy-changes">
        <h2 id="privacy-changes">تعديل السياسة</h2>
        <p>
          نحدّث هذه الصفحة عند تغيّر الميزات الجوهرية. تاريخ «آخر تحديث» أعلاه
          يعكس النسخة السارية. للمزيد: <Link href="/about">عن عربية</Link>.
        </p>
      </section>
    </div>
  );
}
