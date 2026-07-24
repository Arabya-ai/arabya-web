import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { FavoritesLibrary } from "@/components/FavoritesLibrary";

export const metadata: Metadata = {
  title: "أرشيف المفضّلات",
  description: "مفضّلاتك وملاحظات الآيات في عربية",
};

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user) {
    return (
      <div className="shell page-block account-page">
        <p className="auth-kicker">مكتبتك الشخصية</p>
        <h1>أرشيف المفضّلات</h1>
        <p className="auth-lead">
          تُحفظ على جهازك. سجّل الدخول لمزامنتها وعرضها داخل لوحة الحساب.
        </p>
        <FavoritesLibrary mode="full" />
      </div>
    );
  }

  const role = session.user.role ?? "user";

  return (
    <DashboardShell
      area="account"
      role={role}
      kicker="لوحة الحساب"
      title="أرشيف المفضّلات"
      subtitle="كل المفضّلات والملاحظات في مكان واحد منظم."
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/account"
      backLabel="رجوع لنظرة عامة"
    >
      <div className="dash-stack">
        <section className="dash-card">
          <FavoritesLibrary mode="full" />
        </section>
      </div>
    </DashboardShell>
  );
}
