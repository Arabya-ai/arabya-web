import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  redirectLocalized,
  resolveLocale,
} from "@/i18n/locale-params";

import { auth } from "@/auth";
import { AccountPersonalData } from "@/components/AccountPersonalData";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { isCloudSyncConfigured } from "@/lib/cloud-sync";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account" });
  return { title: t("statsPageTitle") };
}

export default async function AccountStatsPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("Account");

  const session = await auth();
  if (!session?.user) redirectLocalized("/login", locale);
  const role = session.user.role ?? "user";

  return (
    <DashboardShell
      area="account"
      role={role}
      kicker={t("kicker")}
      title={t("statsPageTitle")}
      subtitle={t("statsPageSubtitle")}
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/account"
      backLabel={t("backToOverview")}
    >
      <div className="dash-stack">
        <section className="dash-card">
          <h2>{t("personalStatsTitle")}</h2>
          <p className="dash-muted">
            {isCloudSyncConfigured() ? t("dataCloudSync") : t("dataLocalOnly")}
          </p>
          <div className="account-grid account-grid--personal">
            <AccountPersonalData />
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
