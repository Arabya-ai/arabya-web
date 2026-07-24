import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { canAccessStudio } from "@/lib/roles";

export const metadata: Metadata = {
  title: "استوديو المحرر",
};

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessStudio(session.user.role)) redirect("/account");

  return (
    <DashboardShell
      area="studio"
      role={session.user.role}
      kicker="استوديو عربية"
      title="لوحة المحرر"
      subtitle="راجع الجودة والمصادر بواجهة هادئة وسريعة."
      userName={session.user.name}
      userImage={session.user.image}
    >
      <div className="dash-stack">
        <section className="dash-card">
          <h2>مرحباً بالمحرر</h2>
          <p className="dash-muted">
            هنا تراجع جودة المحتوى والمصادر. لا تدير حسابات المستخدمين — ذلك
            للأدمن فقط.
          </p>
          <div className="dash-actions">
            <Link href="/studio/queue" className="account-panel-link">
              طابور الجودة
            </Link>
            <Link href="/studio/sources" className="account-panel-link">
              المصادر
            </Link>
            <Link href="/mushaf/1" className="account-panel-link">
              فتح المصحف
            </Link>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
