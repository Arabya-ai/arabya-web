import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccountPersonalData } from "@/components/AccountPersonalData";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { isCloudSyncConfigured } from "@/lib/cloud-sync";

export const metadata: Metadata = {
  title: "لوحة الإحصائيات",
};

export const dynamic = "force-dynamic";

export default async function AccountStatsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role ?? "user";

  return (
    <DashboardShell
      area="account"
      role={role}
      kicker="لوحة الحساب"
      title="لوحة الإحصائيات"
      subtitle="ملخص قراءتك وعادتك ومفضّلاتك."
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/account"
      backLabel="رجوع لنظرة عامة"
    >
      <div className="dash-stack">
        <section className="dash-card">
          <h2>إحصائياتك الشخصية</h2>
          <p className="dash-muted">
            {isCloudSyncConfigured()
              ? "البيانات المحلية مع المزامنة السحابية عند تسجيل الدخول."
              : "البيانات محفوظة على هذا الجهاز."}
          </p>
          <div className="account-grid account-grid--personal">
            <AccountPersonalData />
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
