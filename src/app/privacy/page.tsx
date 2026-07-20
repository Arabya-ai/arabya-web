import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "سياسة الخصوصية",
};

export default function PrivacyPage() {
  return (
    <div className="shell privacy-page">
      <h1>سياسة الخصوصية</h1>
      <p>
        موقع <strong>Arabya.ai</strong> يحترم خصوصيتك. في المرحلة الحالية لا نجمع
        بيانات شخصية للتصفح، ولا نطلب إنشاء حساب.
      </p>
      <p>
        قد تُستخدم أدوات تحليل أو استضافة قياسية (مثل مزوّد الاستضافة أو شبكة
        التوزيع) لأغراض الأداء والأمان. عند إضافة ميزات لاحقة (مثل الحفظ أو
        الحسابات) سنحدّث هذه الصفحة بوضوح.
      </p>
      <p>
        للاستفسارات المتعلقة بالخصوصية أو الموقع: تواصل عبر حساب المنظمة على
        GitHub — Arabya-ai.
      </p>
    </div>
  );
}
