import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { OwnerBookUploadPanel } from "@/components/OwnerBookUploadPanel";
import {
  redirectLocalized,
  resolveLocale,
} from "@/i18n/locale-params";
import { isCloudSyncConfigured } from "@/lib/cloud-sync";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BookImport" });
  return { title: t("pageTitle") };
}

export default async function AccountImportBookPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("BookImport");
  const tAccount = await getTranslations("Account");

  const session = await auth();
  if (!session?.user) redirectLocalized("/login", locale);

  const syncReady = isCloudSyncConfigured();

  return (
    <DashboardShell
      area="account"
      role={session.user.role ?? "user"}
      kicker={tAccount("kicker")}
      title={t("pageTitle")}
      subtitle={t("pageSubtitle")}
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/account"
      backLabel={tAccount("backToOverview")}
    >
      <OwnerBookUploadPanel syncReady={syncReady} />
    </DashboardShell>
  );
}
