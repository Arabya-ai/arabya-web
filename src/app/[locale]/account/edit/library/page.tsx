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
import { canAccessEditorialTools } from "@/lib/roles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BookImport" });
  return { title: t("editorPageTitle") };
}

/** Editor/admin library book upload — same panel, editorial metadata + nav context. */
export default async function AccountEditLibraryImportPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("BookImport");
  const tEdit = await getTranslations("EditHub");

  const session = await auth();
  if (!session?.user) redirectLocalized("/login", locale);
  if (!canAccessEditorialTools(session.user.role)) {
    redirectLocalized("/account", locale);
  }

  const syncReady = isCloudSyncConfigured();

  return (
    <DashboardShell
      area="account"
      role={session.user.role}
      kicker={tEdit("kicker")}
      title={t("editorPageTitle")}
      subtitle={t("editorPageSubtitle")}
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/account/edit"
      backLabel={tEdit("backEdit")}
    >
      <OwnerBookUploadPanel syncReady={syncReady} editorial />
    </DashboardShell>
  );
}
