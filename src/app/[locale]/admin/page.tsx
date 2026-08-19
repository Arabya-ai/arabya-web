import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  redirectLocalized,
  resolveLocale,
} from "@/i18n/locale-params";

import { auth } from "@/auth";
import { AdminStatsCards } from "@/components/dashboard/AdminStatsCards";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { canAccessAdmin } from "@/lib/roles";
import { isCloudSyncConfigured } from "@/lib/cloud-sync";
import { ArabyaPanel } from "@/components/ui/ArabyaPanel";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: t("metaStatsTitle") };
}

export default async function AdminPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("Admin");

  const session = await auth();
  if (!session?.user) redirectLocalized("/login", locale);
  if (!canAccessAdmin(session.user.role)) redirectLocalized("/account", locale);

  return (
    <DashboardShell
      area="admin"
      role={session.user.role}
      kicker={t("kicker")}
      title={t("statsTitle")}
      subtitle={t("statsSubtitle")}
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/account"
      backLabel={t("backToAccount")}
    >
      <div className="dash-stack">
        {!isCloudSyncConfigured() ? (
          <p className="dash-banner dash-banner--warn">{t("d1DisabledStats")}</p>
        ) : (
          <AdminStatsCards />
        )}
        <ArabyaPanel legacyDash title={t("whatYouCanDo")}>
          <ul className="dash-list">
            <li>{t("actionReviewUsers")}</li>
            <li>{t("actionApproveRequests")}</li>
            <li>{t("actionReviewAudit")}</li>
          </ul>
        </ArabyaPanel>
      </div>
    </DashboardShell>
  );
}
