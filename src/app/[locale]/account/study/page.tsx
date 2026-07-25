import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  redirectLocalized,
  resolveLocale,
} from "@/i18n/locale-params";

import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { StudyArchivePanel } from "@/components/dashboard/StudyArchivePanel";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account" });
  return { title: t("studyPageTitle") };
}

export default async function AccountStudyPage({ params }: Props) {
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
      title={t("studyPageTitle")}
      subtitle={t("studyPageSubtitle")}
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/account"
      backLabel={t("backToOverview")}
    >
      <StudyArchivePanel />
    </DashboardShell>
  );
}
