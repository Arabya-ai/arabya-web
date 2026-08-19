import type { Metadata } from "next";
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AdhkarContentManager } from "@/components/dashboard/AdhkarContentManager";
import { redirectLocalized, resolveLocale } from "@/i18n/locale-params";
import { canAccessEditorialTools } from "@/lib/roles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "EditHub" });
  return { title: `${t("title")} · إدارة الأذكار` };
}

export default async function AccountEditAdhkarContentPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const session = await auth();
  if (!session?.user) redirectLocalized("/login", locale);
  if (!canAccessEditorialTools(session.user.role)) {
    redirectLocalized("/account", locale);
  }

  return (
    <DashboardShell
      area="account"
      role={session.user.role}
      kicker="تحرير المحتوى"
      title="إدارة الأذكار والأدعية"
      subtitle="تعديل هجين آمن: يضيف/يحدث المحتوى بدون حذف ملفات المصدر الأساسية."
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/account/edit"
      backLabel="العودة"
    >
      <AdhkarContentManager />
    </DashboardShell>
  );
}
