import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  redirectLocalized,
  resolveLocale,
} from "@/i18n/locale-params";

import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Link } from "@/i18n/navigation";
import {
  adminGetPortfolio,
  isCloudSyncConfigured,
} from "@/lib/cloud-sync";
import {
  canAccessAdmin,
  isSuperAdminEmail,
  type UserRole,
} from "@/lib/roles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: t("portfolioMetaTitle") };
}

export default async function AdminUserPortfolioPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("Admin");
  const tRoles = await getTranslations("Roles");

  const session = await auth();
  if (!session?.user) redirectLocalized("/login", locale);
  if (!canAccessAdmin(session.user.role)) redirectLocalized("/account", locale);
  if (!isSuperAdminEmail(session.user.email)) redirectLocalized("/admin/users", locale);

  const { id } = await params;
  const userId = decodeURIComponent(id);
  const actorEmail = session.user.email!;

  if (!isCloudSyncConfigured()) {
    return (
      <DashboardShell
        area="admin"
        role={session.user.role}
        kicker={t("kicker")}
        title={t("portfolioMetaTitle")}
        userName={session.user.name}
        userEmail={session.user.email}
        userImage={session.user.image}
        backHref="/admin/users"
        backLabel={t("backToUsers")}
      >
        <p className="dash-banner dash-banner--warn">{t("d1Off")}</p>
      </DashboardShell>
    );
  }

  let data: Awaited<ReturnType<typeof adminGetPortfolio>>;
  try {
    data = await adminGetPortfolio(actorEmail, userId);
  } catch {
    redirectLocalized("/admin/users", locale);
  }

  const u = data.user;
  const bookmarks = Array.isArray(data.bookmarks) ? data.bookmarks : [];
  const notes = Array.isArray(data.notes) ? data.notes : [];
  const userRole = (u.role as UserRole) || "user";

  return (
    <DashboardShell
      area="admin"
      role={session.user.role}
      kicker={t("portfolioKicker")}
      title={u.name || u.email}
      subtitle={t("portfolioSubtitle")}
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/admin/users"
      backLabel={t("backToUsers")}
    >
      <div className="dash-stack">
        <section className="dash-card">
          <div className="dash-user-cell" style={{ gap: "1rem" }}>
            {u.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.image} alt="" width={72} height={72} style={{ borderRadius: "999px" }} />
            ) : null}
            <div>
              <h2 style={{ margin: 0 }}>{u.name || "—"}</h2>
              <p className="dash-muted" dir="ltr" style={{ marginBottom: 0 }}>
                {u.email}
              </p>
              <p className="dash-muted" dir="ltr">
                ID: {u.uid || u.id}
              </p>
              <p>
                {t("roleLabel")}: {tRoles(userRole)} · {t("statusLabel")}:{" "}
                {u.status === "banned" ? t("statusBanned") : t("statusActive")}
              </p>
            </div>
          </div>
        </section>

        <section className="dash-card">
          <h2>{locale === "en" ? "Smart recitation" : "التسميع الذكي"}</h2>
          {"tahfeez" in data && data.tahfeez ? (
            <ul className="dash-list">
              <li>
                {locale === "en" ? "Sessions" : "جلسات"}:{" "}
                {(data.tahfeez as { stats: { totalSessions: number } }).stats
                  .totalSessions}
              </li>
              <li>
                {locale === "en" ? "Accuracy" : "دقة"}:{" "}
                {
                  (data.tahfeez as { stats: { overallAccuracy: number } }).stats
                    .overallAccuracy
                }
                %
              </li>
            </ul>
          ) : (
            <p className="dash-muted">
              {locale === "en" ? "No tahfeez data." : "لا بيانات تسميع."}
            </p>
          )}
          <p style={{ marginTop: "0.75rem" }}>
            <Link href="/admin/tahfeez">
              {locale === "en" ? "All recitation portfolios" : "كل بورتفوليوهات التسميع"}
            </Link>
          </p>
        </section>

        <section className="dash-card">
          <h2>{t("bookmarksTitle", { count: data.bookmarkCount })}</h2>
          {bookmarks.length === 0 ? (
            <p className="dash-muted">{t("noBookmarks")}</p>
          ) : (
            <ul className="dash-list">
              {bookmarks.slice(0, 50).map((b) => {
                const row = b as {
                  key?: string;
                  surahId?: number;
                  verse?: number;
                  page?: number;
                };
                return (
                  <li key={row.key || `${row.surahId}:${row.verse}`}>
                    {t("bookmarkRow", {
                      surah: row.surahId ?? "",
                      verse: row.verse ?? "",
                      page: row.page ?? "",
                    })}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="dash-card">
          <h2>{t("notesTitle", { count: data.noteCount })}</h2>
          {notes.length === 0 ? (
            <p className="dash-muted">{t("noNotes")}</p>
          ) : (
            <ul className="dash-list">
              {notes.slice(0, 50).map((n) => {
                const row = n as {
                  key?: string;
                  surahId?: number;
                  verse?: number;
                  text?: string;
                };
                return (
                  <li key={row.key || `${row.surahId}:${row.verse}`}>
                    {row.surahId}:{row.verse} — {row.text?.slice(0, 120)}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="dash-card">
          <h2>
            {t("studyTitle", {
              count: Array.isArray(data.study) ? data.study.length : 0,
            })}
          </h2>
          {!Array.isArray(data.study) || data.study.length === 0 ? (
            <p className="dash-muted">{t("noStudy")}</p>
          ) : (
            <ul className="dash-list">
              {(data.study as { id?: string; title?: string; kind?: string; notes?: string }[])
                .slice(0, 50)
                .map((s) => (
                  <li key={s.id || s.title}>
                    {t("studyRow", { kind: s.kind || "study", title: s.title ?? "" })}
                    {s.notes ? ` · ${s.notes.slice(0, 80)}` : ""}
                  </li>
                ))}
            </ul>
          )}
        </section>

        <p className="dash-muted">{t("cloudFootnote")}</p>
      </div>
    </DashboardShell>
  );
}
