import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { AccountAdhkarPanel } from "@/components/AccountAdhkarPanel";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { redirectLocalized, resolveLocale } from "@/i18n/locale-params";
import { getAdhkarCategories } from "@/lib/adhkar";
import { isCloudSyncConfigured } from "@/lib/cloud-sync";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account" });
  return {
    title: t("adhkarPageTitle"),
    description: t("adhkarLead"),
  };
}

export default async function AccountAdhkarPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const session = await auth();
  const user = session?.user;
  if (!user) redirectLocalized("/login", locale);

  const t = await getTranslations("Account");
  const categories = await getAdhkarCategories();
  const syncReady = isCloudSyncConfigured();

  return (
    <DashboardShell
      area="account"
      role={user.role ?? "user"}
      kicker={t("kicker")}
      title={t("adhkarPageTitle")}
      subtitle={t("adhkarLead")}
      userName={user.name || t("defaultName")}
      userEmail={user.email}
      userImage={user.image}
      backHref="/account"
      backLabel={t("backToAccount")}
    >
      <AccountAdhkarPanel
        locale={locale}
        syncReady={syncReady}
        categories={categories.map((c) => ({
          slug: c.slug,
          titleAr: c.titleAr,
          titleEn: c.titleEn,
          itemCount: c.itemCount ?? 0,
          targetSum: c.targetSum ?? c.itemCount ?? 0,
        }))}
      />
    </DashboardShell>
  );
}
