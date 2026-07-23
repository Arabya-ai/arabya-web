import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminUsersTable } from "@/components/dashboard/AdminUsersTable";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { canAccessAdmin } from "@/lib/roles";

export const metadata: Metadata = {
  title: "إدارة المستخدمين",
};

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessAdmin(session.user.role)) redirect("/account");

  return (
    <DashboardShell
      area="admin"
      role={session.user.role}
      kicker="إدارة عربية"
      title="المستخدمون"
      userName={session.user.name}
      userImage={session.user.image}
    >
      <AdminUsersTable />
    </DashboardShell>
  );
}
