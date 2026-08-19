import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth, signOut } from "@/auth";
import { AccountHistoryPanel } from "@/components/AccountHistoryPanel";
import { AccountLanguagePanel } from "@/components/AccountLanguagePanel";
import { AccountPersonalData } from "@/components/AccountPersonalData";
import { CloudSyncPanel } from "@/components/CloudSyncPanel";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleRequestPanel } from "@/components/dashboard/RoleRequestPanel";
import { Link } from "@/i18n/navigation";
import {
  redirectLocalized,
  resolveLocale,
} from "@/i18n/locale-params";
import { isCloudSyncConfigured } from "@/lib/cloud-sync";
import { canAccessAdmin, canAccessEditorialTools } from "@/lib/roles";
import { ArabyaPanel } from "@/components/ui/ArabyaPanel";
import { planLabel } from "@/lib/plans";
import type { AppLocale } from "@/lib/plans";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account" });
  return {
    title: t("kicker"),
    description: t("subtitle"),
  };
}

export default async function AccountPage({ params }: Props) {
  const locale = await resolveLocale(params);

  const session = await auth();
  const user = session?.user;
  if (!user) redirectLocalized("/login", locale);

  const t = await getTranslations("Account");
  const role = user.role ?? "user";
  const name = user.name || t("defaultName");
  const syncReady = isCloudSyncConfigured();

  return (
    <DashboardShell
      area="account"
      role={role}
      kicker={t("kicker")}
      title={t("welcome", { name })}
      subtitle={t("subtitle")}
      userName={name}
      userEmail={user.email}
      userImage={user.image}
    >
      <div className="dash-stack">
        <ArabyaPanel accent legacyDash title={t("shortcuts")}>
          <div className="account-hub">
            <Link href="/tahfeez" className="account-hub-card">
              <strong>{t("tahfeez")}</strong>
              <span>{t("tahfeezLead")}</span>
              <em>{t("openRecitation")}</em>
            </Link>
            <Link href="/studio/dashboard" className="account-hub-card">
              <strong>{t("studio")}</strong>
              <span>{t("studioLead")}</span>
              <em>{t("openTool")}</em>
            </Link>
            <Link href="/studio/ai" className="account-hub-card">
              <strong>{t("studioAi")}</strong>
              <span>{t("studioAiLead")}</span>
              <em>{t("openTool")}</em>
            </Link>
            <Link href="/account/adhkar" className="account-hub-card">
              <strong>{t("adhkarTitle")}</strong>
              <span>{t("adhkarLead")}</span>
              <em>{t("openTool")}</em>
            </Link>
            <Link href="/account/study" className="account-hub-card">
              <strong>{t("study")}</strong>
              <span>{t("studyLead")}</span>
              <em>{t("openTool")}</em>
            </Link>
            <Link href="/favorites" className="account-hub-card">
              <strong>{t("favorites")}</strong>
              <span>{t("favoritesLead")}</span>
              <em>{t("openTool")}</em>
            </Link>
            <Link href="/account/stats" className="account-hub-card">
              <strong>{t("statsPageTitle")}</strong>
              <span>{t("statsLead")}</span>
              <em>{t("openTool")}</em>
            </Link>
            {canAccessAdmin(role) ? (
              <Link href="/admin/users" className="account-hub-card">
                <strong>{t("admin")}</strong>
                <span>{t("crmLead")}</span>
                <em>{t("openCrm")}</em>
              </Link>
            ) : null}
            {canAccessEditorialTools(role) ? (
              <Link href="/account/edit" className="account-hub-card">
                <strong>{t("editHub")}</strong>
                <span>{t("qualityQueue")}</span>
                <em>{t("openTool")}</em>
              </Link>
            ) : null}
          </div>
        </ArabyaPanel>

        <ArabyaPanel legacyDash title={t("personalTitle")}>
          <p className="dash-muted" dir="ltr">
            {user.email}
          </p>
          <p>
            {t("planLine", {
              plan: planLabel(user.plan ?? "free", locale as AppLocale),
            })}
            {" · "}
            <Link href="/create">{t("openCreate")}</Link>
            {" · "}
            <Link href="/pricing">{t("viewPricing")}</Link>
          </p>
          <div className="account-grid account-grid--personal">
            <AccountPersonalData />
          </div>
        </ArabyaPanel>

        <AccountLanguagePanel />

        {syncReady ? <CloudSyncPanel /> : null}

        <AccountHistoryPanel syncReady={syncReady} />

        <RoleRequestPanel role={role} />

        <form
          className="account-signout"
          action={async () => {
            "use server";
            await signOut({
              redirectTo: locale === "en" ? "/en" : "/",
            });
          }}
        >
          <button type="submit" className="auth-btn auth-btn--ghost">
            {t("signOut")}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
