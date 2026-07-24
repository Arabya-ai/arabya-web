import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminAuditList } from "@/components/dashboard/AdminAuditList";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { canAccessAdmin } from "@/lib/roles";

export const metadata: Metadata = {
  title: "سجل الأدوار",
};

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessAdmin(session.user.role)) redirect("/account");

  return (
    <DashboardShell
      area="admin"
      role={session.user.role}
      kicker="إدارة عربية"
      title="سجل تغيير الأدوار"
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/admin"
      backLabel="رجوع للإحصائيات"
    >
      <AdminAuditList />
    </DashboardShell>
  );
}
