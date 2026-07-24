import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { canAccessStudio } from "@/lib/roles";
import { QualityQueueClient } from "@/components/dashboard/QualityQueueClient";

export const metadata: Metadata = {
  title: "طابور الجودة",
};

export const dynamic = "force-dynamic";

export default async function StudioQueuePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessStudio(session.user.role)) redirect("/account");

  return (
    <DashboardShell
      area="studio"
      role={session.user.role}
      kicker="استوديو عربية"
      title="طابور الجودة"
      subtitle="نتائج فحص حقيقي لسلامة البيانات — بلا عناصر وهمية."
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/studio"
      backLabel="رجوع للاستوديو"
    >
      <QualityQueueClient initialItems={[]} autoScan />
    </DashboardShell>
  );
}
