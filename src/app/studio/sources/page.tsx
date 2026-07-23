import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { canAccessStudio } from "@/lib/roles";

export const metadata: Metadata = {
  title: "مصادر المحتوى",
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
      userName={session.user.name}
      userImage={session.user.image}
    >
      <div className="dash-stack">
        <section className="dash-card">
          <h2>سياسة المصادر</h2>
          <ul className="dash-list">
            <li>لا يُعاد نشر محتوى محمي من مواقع منافسة.</li>
            <li>الاستيراد فقط من APIs مفتوحة أو ملفات مرخّصة يزوّدها المالك.</li>
            <li>كل طبقة تحليل تحتاج حقل مصدر واضح في الواجهة.</li>
          </ul>
        </section>
        <section className="dash-card">
          <h2>حالة الأدوات</h2>
          <p className="dash-muted">
            سكربتات الاستيراد (`scripts/import-*`, `fetch-*`) تُشغَّل من بيئة
            التطوير/CI. ستظهر هنا لاحقًا حالة آخر تشغيل عند ربطها باللوحة.
          </p>
        </section>
      </div>
    </DashboardShell>
  );
}
