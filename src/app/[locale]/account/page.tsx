import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth, signOut } from "@/auth";
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
import { canAccessAdmin, canAccessStudio } from "@/lib/roles";

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
        <section className="dash-card">
          <h2>{t("personalTitle")}</h2>
          <p className="dash-muted" dir="ltr">
            {user.email}
          </p>
          <div className="account-grid account-grid--personal">
            <AccountPersonalData />
          </div>
        </section>

        <AccountLanguagePanel />

        {(canAccessStudio(role) || canAccessAdmin(role)) && (
          <section className="dash-card dash-card--accent">
            <h2>{t("shortcuts")}</h2>
            <div className="dash-actions">
              {canAccessStudio(role) ? (
                <Link href="/studio" className="account-panel-link">
                  {t("studio")}
                </Link>
              ) : null}
              {canAccessAdmin(role) ? (
                <Link href="/admin" className="account-panel-link">
                  {t("admin")}
                </Link>
              ) : null}
              <Link href="/account/study" className="account-panel-link">
                {t("study")}
              </Link>
              <Link href="/favorites" className="account-panel-link">
                {t("favorites")}
              </Link>
            </div>
          </section>
        )}

        {syncReady ? <CloudSyncPanel /> : null}

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
