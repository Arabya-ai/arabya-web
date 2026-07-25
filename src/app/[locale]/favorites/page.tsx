import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale-params";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { FavoritesLibrary } from "@/components/FavoritesLibrary";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Favorites" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export const dynamic = "force-dynamic";

export default async function FavoritesPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Favorites" });
  const tAccount = await getTranslations({ locale, namespace: "Account" });
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="shell page-block account-page">
        <p className="auth-kicker">{t("kicker")}</p>
        <h1>{t("pageTitle")}</h1>
        <p className="auth-lead">{t("lead")}</p>
        <FavoritesLibrary mode="full" />
      </div>
    );
  }

  const role = session.user.role ?? "user";

  return (
    <DashboardShell
      area="account"
      role={role}
      kicker={t("dashboardKicker")}
      title={t("pageTitle")}
      subtitle={t("dashboardSubtitle")}
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/account"
      backLabel={tAccount("backToOverview")}
    >
      <div className="dash-stack">
        <section className="dash-card">
          <FavoritesLibrary mode="full" />
        </section>
      </div>
    </DashboardShell>
  );
}
