import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminRequestsPanel } from "@/components/dashboard/AdminRequestsPanel";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { canAccessAdmin } from "@/lib/roles";

export const metadata: Metadata = {
  title: "طلبات الترقية",
};

export const dynamic = "force-dynamic";

export default async function AdminRequestsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessAdmin(session.user.role)) redirect("/account");

  return (
    <DashboardShell
      area="admin"
      role={session.user.role}
      kicker="إدارة عربية"
      title="طلبات الترقية"
      subtitle="طلبات المحررين والمديرين — ترقية المدير للسوبر أدمن فقط."
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/admin"
      backLabel="رجوع للإحصائيات"
    >
      <AdminRequestsPanel />
    </DashboardShell>
  );
}
