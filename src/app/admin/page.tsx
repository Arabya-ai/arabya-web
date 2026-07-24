import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminStatsCards } from "@/components/dashboard/AdminStatsCards";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { canAccessAdmin } from "@/lib/roles";
import { isCloudSyncConfigured } from "@/lib/cloud-sync";

export const metadata: Metadata = {
  title: "إدارة عربية — إحصائيات",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessAdmin(session.user.role)) redirect("/account");

  return (
    <DashboardShell
      area="admin"
      role={session.user.role}
      kicker="إدارة عربية"
      title="لوحة الإحصائيات"
      subtitle="نظرة حيّة على الحسابات والنشاط والمزامنة السحابية."
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/account"
      backLabel="رجوع لحسابي"
    >
      <div className="dash-stack">
        {!isCloudSyncConfigured() ? (
          <p className="dash-banner dash-banner--warn">
            مزامنة D1 غير مفعّلة — فعّل ARABYA_D1_ENABLED ورابط الـ Worker لعرض
            الإحصائيات الحية.
          </p>
        ) : (
          <AdminStatsCards />
        )}
        <section className="dash-card">
          <h2>ماذا يمكنك فعله هنا؟</h2>
          <ul className="dash-list">
            <li>مراجعة المستخدمين وترقية المحررين من تبويب المستخدمون.</li>
            <li>الموافقة على طلبات الترقية.</li>
            <li>مراجعة سجل تغيير الأدوار.</li>
          </ul>
        </section>
      </div>
    </DashboardShell>
  );
}
