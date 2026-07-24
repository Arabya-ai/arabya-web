import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { canAccessAdmin } from "@/lib/roles";
import { getAuthEnvDiagnostics, isGoogleAuthConfigured } from "@/auth";
import { isCloudSyncConfigured } from "@/lib/cloud-sync";

export const metadata: Metadata = {
  title: "إعدادات المنصة",
};

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessAdmin(session.user.role)) redirect("/account");

  const authDiag = getAuthEnvDiagnostics();
  const syncOn = isCloudSyncConfigured();

  return (
    <DashboardShell
      area="admin"
      role={session.user.role}
      kicker="إدارة عربية"
      title="إعدادات المنصة"
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/admin"
      backLabel="رجوع للإحصائيات"
    >
      <div className="dash-stack">
        <section className="dash-card">
          <h2>حالة الخدمات</h2>
          <ul className="dash-list">
            <li>
              Google OAuth:{" "}
              {isGoogleAuthConfigured() ? "مفعّل" : "غير مكتمل"}
            </li>
            <li>مزامنة D1: {syncOn ? "مفعّلة" : "غير مفعّلة"}</li>
            <li>AUTH_SECRET: {authDiag.hasSecret ? "موجود" : "ناقص"}</li>
            <li dir="ltr">AUTH_URL: {authDiag.authUrl}</li>
          </ul>
          <p className="dash-muted">
            السوبر أدمن: egywebdev@gmail.com و arabyaaicom@gmail.com — لا
            يُخفَّضون من الواجهة. بعد نشر Worker شغّل أعمدة uid و target_role عبر
            schema-migrate.sql على D1.
          </p>
        </section>
        <section className="dash-card">
          <h2>محتوى المنصة</h2>
          <p className="dash-muted">
            نص القرآن وطبقات التحليل تُدار من مستودع Git وسكربتات الاستيراد،
            ولوحة الاستوديو لمتابعة الجودة والمصادر حسب سير عملك.
          </p>
        </section>
      </div>
    </DashboardShell>
  );
}
