import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  redirectLocalized,
  resolveLocale,
} from "@/i18n/locale-params";

import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { canAccessAdmin } from "@/lib/roles";
import { getAuthEnvDiagnostics, isGoogleAuthConfigured } from "@/auth";
import { isCloudSyncConfigured } from "@/lib/cloud-sync";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: t("settingsMetaTitle") };
}

export default async function AdminSettingsPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("Admin");

  const session = await auth();
  if (!session?.user) redirectLocalized("/login", locale);
  if (!canAccessAdmin(session.user.role)) redirectLocalized("/account", locale);

  const authDiag = getAuthEnvDiagnostics();
  const syncOn = isCloudSyncConfigured();

  return (
    <DashboardShell
      area="admin"
      role={session.user.role}
      kicker={t("kicker")}
      title={t("settingsTitle")}
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/admin"
      backLabel={t("backToStats")}
    >
      <div className="dash-stack">
        <section className="dash-card">
          <h2>{t("servicesTitle")}</h2>
          <ul className="dash-list">
            <li>
              {t("googleOAuth")}:{" "}
              {isGoogleAuthConfigured() ? t("enabled") : t("incomplete")}
            </li>
            <li>
              {t("d1Sync")}: {syncOn ? t("enabledF") : t("disabledF")}
            </li>
            <li>
              {t("authSecret")}: {authDiag.hasSecret ? t("present") : t("missing")}
            </li>
            <li dir="ltr">
              AUTH_URL: {authDiag.authUrl}
            </li>
          </ul>
          <p className="dash-muted">{t("superAdminNote")}</p>
        </section>
        <section className="dash-card">
          <h2>{t("contentTitle")}</h2>
          <p className="dash-muted">{t("contentLead")}</p>
        </section>
      </div>
    </DashboardShell>
  );
}
