import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { AccountPersonalData } from "@/components/AccountPersonalData";
import { CloudSyncPanel } from "@/components/CloudSyncPanel";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleRequestPanel } from "@/components/dashboard/RoleRequestPanel";
import { isCloudSyncConfigured } from "@/lib/cloud-sync";
import { canAccessAdmin, canAccessStudio } from "@/lib/roles";

export const metadata: Metadata = {
  title: "لوحة الحساب",
  description: "لوحة المشترك في عربية",
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role ?? "user";
  const name = session.user.name || "مشترك عربية";
  const syncReady = isCloudSyncConfigured();

  return (
    <DashboardShell
      area="account"
      role={role}
      kicker="لوحة الحساب"
      title={`مرحبًا، ${name}`}
      subtitle="إدارة قراءتك ومفضّلاتك ودراستك وصلاحياتك من قائمة واحدة."
      userName={name}
      userEmail={session.user.email}
      userImage={session.user.image}
    >
      <div className="dash-stack">
        <section className="dash-card">
          <h2>بياناتك الشخصية</h2>
          <p className="dash-muted" dir="ltr">
            {session.user.email}
          </p>
          <div className="account-grid account-grid--personal">
            <AccountPersonalData />
          </div>
        </section>

        {(canAccessStudio(role) || canAccessAdmin(role)) && (
          <section className="dash-card dash-card--accent">
            <h2>اختصارات</h2>
            <div className="dash-actions">
              {canAccessStudio(role) ? (
                <Link href="/studio" className="account-panel-link">
                  الاستوديو
                </Link>
              ) : null}
              {canAccessAdmin(role) ? (
                <Link href="/admin" className="account-panel-link">
                  إدارة عربية
                </Link>
              ) : null}
              <Link href="/account/study" className="account-panel-link">
                دراسة
              </Link>
              <Link href="/favorites" className="account-panel-link">
                المفضّلات
              </Link>
            </div>
          </section>
        )}

        {syncReady ? <CloudSyncPanel /> : null}

        <RoleRequestPanel role={role} />

        <form
          className="account-signout"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button type="submit" className="auth-btn auth-btn--ghost">
            تسجيل الخروج
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
