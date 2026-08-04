import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  redirectLocalized,
  resolveLocale,
} from "@/i18n/locale-params";

import { auth } from "@/auth";
import { AdminAppearancePanel } from "@/components/dashboard/AdminAppearancePanel";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { canAccessAdmin } from "@/lib/roles";
import { getAuthEnvDiagnostics, isGoogleAuthConfigured } from "@/auth";
import { isCloudSyncConfigured } from "@/lib/cloud-sync";
import { AdminSettingsTabs } from "@/components/dashboard/AdminSettingsTabs";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: t("settingsMetaTitle") };
}

export default async function AdminSettingsPage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("Admin");
  const sp = await searchParams;
  const tab =
    sp.tab === "appearance" || sp.tab === "content" ? sp.tab : "services";

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
        <AdminSettingsTabs active={tab} />

        {tab === "services" ? (
          <section className="dash-card" aria-labelledby="admin-tab-services">
            <h2 id="admin-tab-services">{t("servicesTitle")}</h2>
            <ul className="dash-list">
              <li>
                {t("googleOAuth")}:{" "}
                {isGoogleAuthConfigured() ? t("enabled") : t("incomplete")}
              </li>
              <li>
                {t("d1Sync")}: {syncOn ? t("enabledF") : t("disabledF")}
              </li>
              <li>
                {t("authSecret")}:{" "}
                {authDiag.hasSecret ? t("present") : t("missing")}
              </li>
              <li dir="ltr">AUTH_URL: {authDiag.authUrl}</li>
            </ul>
            <p className="dash-muted">{t("superAdminNote")}</p>
          </section>
        ) : null}

        {tab === "appearance" ? (
          <section className="dash-card" aria-labelledby="admin-tab-appearance">
            <h2 id="admin-tab-appearance">{t("appearanceTitle")}</h2>
            <AdminAppearancePanel />
          </section>
        ) : null}

        {tab === "content" ? (
          <section className="dash-card" aria-labelledby="admin-tab-content">
            <h2 id="admin-tab-content">{t("contentTitle")}</h2>
            <p className="dash-muted">{t("contentLead")}</p>
          </section>
        ) : null}
      </div>
    </DashboardShell>
  );
}
