import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  redirectLocalized,
  resolveLocale,
} from "@/i18n/locale-params";

import { auth } from "@/auth";
import { AdminAppearancePanel } from "@/components/dashboard/AdminAppearancePanel";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AdminSuperAdminDiagnostics } from "@/components/dashboard/AdminSuperAdminDiagnostics";
import { canAccessAdmin } from "@/lib/roles";
import { getAuthEnvDiagnostics, isGoogleAuthConfigured } from "@/auth";
import { isCloudSyncConfigured } from "@/lib/cloud-sync";
import { AdminSettingsTabs } from "@/components/dashboard/AdminSettingsTabs";
import { AdminPrayerDefaultsPanel } from "@/components/dashboard/AdminPrayerDefaultsPanel";
import { ArabyaPanel, ArabyaPanelStack } from "@/components/ui/ArabyaPanel";

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
      <ArabyaPanelStack className="dash-stack">
        <AdminSettingsTabs active={tab} />

        {tab === "services" ? (
          <ArabyaPanel legacyDash aria-labelledby="admin-tab-services" titleId="admin-tab-services" title={t("servicesTitle")}>
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
            <AdminSuperAdminDiagnostics
              sessionEmail={session.user.email}
              labels={{
                title: t("superAdminDiagTitle"),
                count: t("superAdminDiagCount"),
                yoursInList: t("superAdminDiagYoursInList"),
                yoursMissing: t("superAdminDiagYoursMissing"),
                notConfigured: t("superAdminDiagNotConfigured"),
                crmGateNote: t("superAdminDiagCrmGate"),
                reLoginHint: t("superAdminDiagReLogin"),
              }}
            />
            <p className="dash-muted">{t("superAdminNote")}</p>
            <hr className="my-4 border-[var(--line)]" />
            <h3 className="mb-2">الإعدادات الافتراضية لمواقيت الصلاة</h3>
            <AdminPrayerDefaultsPanel />
          </ArabyaPanel>
        ) : null}

        {tab === "appearance" ? (
          <ArabyaPanel
            legacyDash
            aria-labelledby="admin-tab-appearance"
            titleId="admin-tab-appearance"
            title={t("appearanceTitle")}
          >
            <AdminAppearancePanel />
          </ArabyaPanel>
        ) : null}

        {tab === "content" ? (
          <ArabyaPanel
            legacyDash
            aria-labelledby="admin-tab-content"
            titleId="admin-tab-content"
            title={t("contentTitle")}
            muted={t("contentLead")}
          />
        ) : null}
      </ArabyaPanelStack>
    </DashboardShell>
  );
}
