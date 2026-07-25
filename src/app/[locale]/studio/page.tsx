import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  redirectLocalized,
  resolveLocale,
} from "@/i18n/locale-params";

import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { canAccessStudio } from "@/lib/roles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Studio" });
  return { title: t("metaEditorTitle") };
}

export default async function StudioPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("Studio");

  const session = await auth();
  if (!session?.user) redirectLocalized("/login", locale);
  if (!canAccessStudio(session.user.role)) redirectLocalized("/account", locale);

  return (
    <DashboardShell
      area="studio"
      role={session.user.role}
      kicker={t("kicker")}
      title={t("dashboardTitle")}
      subtitle={t("dashboardSubtitle")}
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/account"
      backLabel={t("backToAccount")}
    >
      <div className="dash-stack">
        <section className="dash-card">
          <h2>{t("welcomeTitle")}</h2>
          <p className="dash-muted">{t("welcomeLead")}</p>
          <div className="dash-actions">
            <Link href="/studio/queue" className="account-panel-link">
              {t("queueLink")}
            </Link>
            <Link href="/studio/sources" className="account-panel-link">
              {t("sourcesLink")}
            </Link>
            <Link href="/mushaf/1" className="account-panel-link">
              {t("openMushaf")}
            </Link>
          </div>
          <p className="dash-muted" style={{ marginTop: "0.75rem" }}>
            {t("queueCoverageHint")}
          </p>
        </section>
      </div>
    </DashboardShell>
  );
}
