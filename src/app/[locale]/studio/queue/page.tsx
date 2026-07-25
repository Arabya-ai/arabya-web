import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  redirectLocalized,
  resolveLocale,
} from "@/i18n/locale-params";

import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { canAccessStudio } from "@/lib/roles";
import { QualityQueueClient } from "@/components/dashboard/QualityQueueClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Studio" });
  return { title: t("queueMetaTitle") };
}

export default async function StudioQueuePage({ params }: Props) {
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
      title={t("queueTitle")}
      subtitle={t("queueSubtitle")}
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/studio"
      backLabel={t("backToStudio")}
    >
      <QualityQueueClient initialItems={[]} autoScan />
    </DashboardShell>
  );
}
