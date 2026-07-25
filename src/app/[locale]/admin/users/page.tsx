import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  redirectLocalized,
  resolveLocale,
} from "@/i18n/locale-params";

import { auth } from "@/auth";
import { AdminUsersTable } from "@/components/dashboard/AdminUsersTable";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { canAccessAdmin, isSuperAdminEmail } from "@/lib/roles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: t("usersMetaTitle") };
}

export default async function AdminUsersPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("Admin");

  const session = await auth();
  if (!session?.user) redirectLocalized("/login", locale);
  if (!canAccessAdmin(session.user.role)) redirectLocalized("/account", locale);

  return (
    <DashboardShell
      area="admin"
      role={session.user.role}
      kicker={t("kicker")}
      title={t("usersTitle")}
      subtitle={t("usersSubtitle")}
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/admin"
      backLabel={t("backToStats")}
    >
      <AdminUsersTable isSuperAdmin={isSuperAdminEmail(session.user.email)} />
    </DashboardShell>
  );
}
