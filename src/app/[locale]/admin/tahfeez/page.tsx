import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Link } from "@/i18n/navigation";
import {
  redirectLocalized,
  resolveLocale,
} from "@/i18n/locale-params";
import {
  adminListTahfeezSummaries,
  isCloudSyncConfigured,
} from "@/lib/cloud-sync";
import { canAccessAdmin, isSuperAdminEmail } from "@/lib/roles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Admin · التسميع" };
}

export default async function AdminTahfeezPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("Admin");
  const session = await auth();
  if (!session?.user) redirectLocalized("/login", locale);
  if (!canAccessAdmin(session.user.role)) redirectLocalized("/account", locale);
  if (!isSuperAdminEmail(session.user.email)) {
    redirectLocalized("/admin/users", locale);
  }

  let rows: Awaited<ReturnType<typeof adminListTahfeezSummaries>>["rows"] = [];
  if (isCloudSyncConfigured()) {
    try {
      const data = await adminListTahfeezSummaries(session.user.email!);
      rows = data.rows;
    } catch {
      rows = [];
    }
  }

  return (
    <DashboardShell
      area="admin"
      role={session.user.role}
      kicker={t("kicker")}
      title={locale === "en" ? "Recitation oversight" : "متابعة التسميع"}
      subtitle={
        locale === "en"
          ? "All signed-in users’ tahfeez portfolios"
          : "بورتفوليو التسميع لجميع المستخدمين المسجّلين"
      }
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/admin/users"
      backLabel={t("backToUsers")}
    >
      <div className="dash-card">
        <p className="mb-3 text-sm">
          <Link href="/admin/users">
            {locale === "en"
              ? "Manage roles (promote / demote) in Users"
              : "إدارة الأدوار (ترقية / تخفيض) من المستخدمين"}
          </Link>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-start">
                <th className="py-2 pe-3">{locale === "en" ? "User" : "المستخدم"}</th>
                <th className="py-2 pe-3">{locale === "en" ? "Role" : "الدور"}</th>
                <th className="py-2 pe-3">{locale === "en" ? "Sessions" : "جلسات"}</th>
                <th className="py-2 pe-3">{locale === "en" ? "Accuracy" : "دقة"}</th>
                <th className="py-2">{locale === "en" ? "Updated" : "تحديث"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-muted-foreground">
                    {locale === "en" ? "No tahfeez data yet." : "لا بيانات تسميع بعد."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.email} className="border-b border-border/40">
                    <td className="py-2 pe-3">
                      <Link href={`/admin/users/${encodeURIComponent(r.email)}`}>
                        {r.name || r.email}
                      </Link>
                    </td>
                    <td className="py-2 pe-3">{r.role}</td>
                    <td className="py-2 pe-3">{r.totalSessions}</td>
                    <td className="py-2 pe-3">{r.overallAccuracy}%</td>
                    <td className="py-2">
                      {new Date(r.updatedAt).toLocaleString(locale)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
