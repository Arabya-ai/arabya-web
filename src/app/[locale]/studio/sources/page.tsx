import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  redirectLocalized,
  resolveLocale,
} from "@/i18n/locale-params";

import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SourcesUploadPanel } from "@/components/dashboard/SourcesUploadPanel";
import { canAccessStudio } from "@/lib/roles";
import { isCloudSyncConfigured } from "@/lib/cloud-sync";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Studio" });
  return { title: t("sourcesMetaTitle") };
}

export default async function StudioSourcesPage({ params }: Props) {
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
      title={t("sourcesTitle")}
      subtitle={t("sourcesSubtitle")}
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/studio"
      backLabel={t("backToStudio")}
    >
      <div className="dash-stack">
        {!isCloudSyncConfigured() ? (
          <p className="dash-banner dash-banner--warn">{t("d1Disabled")}</p>
        ) : (
          <SourcesUploadPanel />
        )}
        <section className="dash-card">
          <h2>{t("localScriptsTitle")}</h2>
          <ul className="dash-list">
            <li>{t("scriptImportIrab")}</li>
            <li>{t("scriptImportIncoming")}</li>
            <li>{t("scriptFetchIa")}</li>
          </ul>
        </section>
      </div>
    </DashboardShell>
  );
}
