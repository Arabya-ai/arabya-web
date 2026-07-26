import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Link } from "@/i18n/navigation";
import {
  redirectLocalized,
  resolveLocale,
} from "@/i18n/locale-params";
import { canAccessStudio } from "@/lib/roles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "EditHub" });
  return { title: t("metaTitle") };
}

export default async function AccountEditHubPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const session = await auth();
  if (!session?.user) redirectLocalized("/login", locale);
  if (!canAccessStudio(session.user.role)) {
    redirectLocalized("/account", locale);
  }

  const t = await getTranslations("EditHub");

  return (
    <DashboardShell
      area="account"
      role={session.user.role}
      kicker={t("kicker")}
      title={t("title")}
      subtitle={t("subtitle")}
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/account"
      backLabel={t("backAccount")}
    >
      <section className="dash-card">
        <p className="text-sm text-[var(--muted)] leading-relaxed mb-4">
          {t("intro")}
        </p>
        <div className="dash-actions">
          <Link href="/account/edit/queue" className="account-panel-link">
            {t("queue")}
          </Link>
          <Link href="/account/edit/sources" className="account-panel-link">
            {t("sources")}
          </Link>
          <Link href="/studio" className="account-panel-link">
            {t("openStudio")}
          </Link>
        </div>
      </section>
    </DashboardShell>
  );
}
