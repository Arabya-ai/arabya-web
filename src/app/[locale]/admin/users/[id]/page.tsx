import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  redirectLocalized,
  resolveLocale,
} from "@/i18n/locale-params";

import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import {
  adminGetPortfolio,
  isCloudSyncConfigured,
} from "@/lib/cloud-sync";
import {
  canAccessAdmin,
  isSuperAdminEmail,
  type UserRole,
} from "@/lib/roles";
import type { TahfeezPortfolio } from "@/lib/tahfeez/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: t("portfolioMetaTitle") };
}

function formatWhen(value: number | string | null | undefined, locale: string) {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return new Date(n).toLocaleString(locale);
}

export default async function AdminMemberFilePage({ params }: Props) {
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
  const tahfeez = (data.tahfeez || null) as TahfeezPortfolio | null;
  const progress = data.progress as { lastPage?: number | null } | undefined;

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
              <dl className="crm-meta">
                <div>
                  <dt>{t("createdLabel")}</dt>
                  <dd>{formatWhen(u.createdAt, locale)}</dd>
                </div>
                <div>
                  <dt>{t("lastSeenLabel")}</dt>
                  <dd>{formatWhen(u.lastSeenAt, locale)}</dd>
                </div>
                <div>
                  <dt>{t("lastPageLabel")}</dt>
                  <dd>{progress?.lastPage ?? "—"}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section className="dash-card">
          <h2>{t("recitationTitle")}</h2>
          {tahfeez ? (
            <>
              <ul className="dash-list">
                <li>
                  {t("colTahfeez")}: {tahfeez.stats.totalSessions}
                </li>
                <li>
                  {t("colAccuracy")}: {tahfeez.stats.overallAccuracy}%
                </li>
                <li>
                  {t("recitationWords")}: {tahfeez.stats.totalCorrectWords} /{" "}
                  {tahfeez.stats.totalWrongWords}
                </li>
              </ul>
              <h3 style={{ marginTop: "1rem", fontSize: "1rem" }}>
                {t("recitationSessions")}
              </h3>
              {tahfeez.sessions.length === 0 ? (
                <p className="dash-muted">{t("noRecitation")}</p>
              ) : (
                <ul className="dash-list">
                  {tahfeez.sessions.slice(0, 30).map((s) => (
                    <li key={s.id}>
                      {s.surahName} · {s.ayahStart}
                      {s.ayahEnd !== s.ayahStart ? `–${s.ayahEnd}` : ""} · {s.accuracy}% ·{" "}
                      {new Date(s.completedAt).toLocaleString(locale)}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="dash-muted">{t("noRecitation")}</p>
          )}
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
