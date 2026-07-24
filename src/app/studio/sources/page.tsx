import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SourcesUploadPanel } from "@/components/dashboard/SourcesUploadPanel";
import { canAccessStudio } from "@/lib/roles";
import { isCloudSyncConfigured } from "@/lib/cloud-sync";

export const metadata: Metadata = {
  title: "المصادر والاستيراد",
};

export const dynamic = "force-dynamic";

export default async function StudioSourcesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessStudio(session.user.role)) redirect("/account");

  return (
    <DashboardShell
      area="studio"
      role={session.user.role}
      kicker="استوديو عربية"
      title="المصادر والاستيراد"
      subtitle="رفع ملفات JSON وربطها بسكربتات الاستيراد في المستودع."
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/studio"
      backLabel="رجوع للاستوديو"
    >
      <div className="dash-stack">
        {!isCloudSyncConfigured() ? (
          <p className="dash-banner dash-banner--warn">
            مزامنة D1 غير مفعّلة — فعّلها لتخزين المرفوعات في السحابة.
          </p>
        ) : (
          <SourcesUploadPanel />
        )}
        <section className="dash-card">
          <h2>سكربتات الاستيراد المحلية</h2>
          <ul className="dash-list">
            <li>
              <code>npm run import-irab-book</code> — استيراد كتاب إعراب إلى{" "}
              <code>data/books</code>
            </li>
            <li>
              <code>npm run import-from-incoming</code> — من مجلد{" "}
              <code>incoming/</code> بعد تأكيد الحقوق
            </li>
            <li>
              <code>npm run fetch-ia-item</code> — قناة Internet Archive المحلية
            </li>
          </ul>
        </section>
      </div>
    </DashboardShell>
  );
}
