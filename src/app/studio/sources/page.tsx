import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { canAccessStudio } from "@/lib/roles";

export const metadata: Metadata = {
  title: "المصادر والاستيراد",
};

export const dynamic = "force-dynamic";

export default async function StudioSourcesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessStudio(session.user.role)) redirect("/account");

  return (
    <DashboardShell
      area="studio"
      role={session.user.role}
      kicker="استوديو عربية"
      title="المصادر والاستيراد"
      subtitle="إدارة مصادر المحتوى والاستيراد حسب ما تقرّره للمنصة."
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/studio"
      backLabel="رجوع للاستوديو"
    >
      <div className="dash-stack">
        <section className="dash-card">
          <h2>أدوات الاستيراد</h2>
          <p className="dash-muted">
            من هنا تُدار عمليات الاستيراد والملفات المرفوعة لاحقًا. يمكنك ربط
            سكربتات المشروع (`scripts/import-*`, `fetch-*`) أو رفع مصادر جديدة
            حسب سير عملك.
          </p>
          <ul className="dash-list">
            <li>استيراد من ملفات محلية يزوّدها فريق عربية.</li>
            <li>تشغيل فهارس البناء وتحديث طبقات التحليل.</li>
            <li>متابعة حالة آخر استيراد (تُربط هنا في التحديثات القادمة).</li>
          </ul>
        </section>
        <section className="dash-card">
          <h2>رفع مصدر</h2>
          <p className="dash-muted">
            واجهة الرفع المباشر تُفعَّل في خطوة لاحقة مع تخزين آمن للملفات. حتى
            ذلك الحين استخدم سكربتات الاستيراد المعتمدة في المستودع.
          </p>
        </section>
      </div>
    </DashboardShell>
  );
}
