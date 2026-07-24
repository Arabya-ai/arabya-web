import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { StudyArchivePanel } from "@/components/dashboard/StudyArchivePanel";

export const metadata: Metadata = {
  title: "أرشيف الدراسة",
};

export const dynamic = "force-dynamic";

export default async function AccountStudyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role ?? "user";

  return (
    <DashboardShell
      area="account"
      role={role}
      kicker="لوحة الحساب"
      title="دراسة"
      subtitle="كل ما درسته من كلمات وبحث سريع — قابل للتعديل والحذف."
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/account"
      backLabel="رجوع لنظرة عامة"
    >
      <StudyArchivePanel />
    </DashboardShell>
  );
}
