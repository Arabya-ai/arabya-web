import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import {
  adminGetPortfolio,
  isCloudSyncConfigured,
} from "@/lib/cloud-sync";
import {
  canAccessAdmin,
  isSuperAdminEmail,
  roleLabelAr,
  type UserRole,
} from "@/lib/roles";

export const metadata: Metadata = {
  title: "ملف المستخدم",
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminUserPortfolioPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessAdmin(session.user.role)) redirect("/account");
  if (!isSuperAdminEmail(session.user.email)) redirect("/admin/users");

  const { id } = await params;
  const userId = decodeURIComponent(id);
  const actorEmail = session.user.email!;

  if (!isCloudSyncConfigured()) {
    return (
      <DashboardShell
        area="admin"
        role={session.user.role}
        kicker="إدارة عربية"
        title="ملف المستخدم"
        userName={session.user.name}
        userEmail={session.user.email}
        userImage={session.user.image}
        backHref="/admin/users"
      >
        <p className="dash-banner dash-banner--warn">D1 غير مفعّل.</p>
      </DashboardShell>
    );
  }

  let data: Awaited<ReturnType<typeof adminGetPortfolio>>;
  try {
    data = await adminGetPortfolio(actorEmail, userId);
  } catch {
    redirect("/admin/users");
  }

  const u = data.user;
  const bookmarks = Array.isArray(data.bookmarks) ? data.bookmarks : [];
  const notes = Array.isArray(data.notes) ? data.notes : [];

  return (
    <DashboardShell
      area="admin"
      role={session.user.role}
      kicker="بورتفوليو المستخدم"
      title={u.name || u.email}
      subtitle="عرض كامل لبيانات الحساب — للسوبر أدمن فقط."
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/admin/users"
      backLabel="رجوع للمستخدمين"
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
                الدور: {roleLabelAr((u.role as UserRole) || "user")} · الحالة:{" "}
                {u.status === "banned" ? "محظور" : "نشط"}
              </p>
            </div>
          </div>
        </section>

        <section className="dash-card">
          <h2>المفضّلات ({data.bookmarkCount})</h2>
          {bookmarks.length === 0 ? (
            <p className="dash-muted">لا مفضّلات.</p>
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
                    سورة {row.surahId} آية {row.verse} — صفحة {row.page}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="dash-card">
          <h2>الملاحظات ({data.noteCount})</h2>
          {notes.length === 0 ? (
            <p className="dash-muted">لا ملاحظات.</p>
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
          <h2>أرشيف الدراسة ({Array.isArray(data.study) ? data.study.length : 0})</h2>
          {!Array.isArray(data.study) || data.study.length === 0 ? (
            <p className="dash-muted">لا دراسات مزامَنة.</p>
          ) : (
            <ul className="dash-list">
              {(data.study as { id?: string; title?: string; kind?: string; notes?: string }[])
                .slice(0, 50)
                .map((s) => (
                  <li key={s.id || s.title}>
                    {s.kind || "دراسة"} — {s.title}
                    {s.notes ? ` · ${s.notes.slice(0, 80)}` : ""}
                  </li>
                ))}
            </ul>
          )}
        </section>

        <p className="dash-muted">
          البيانات أعلاه من المزامنة السحابية (D1) للمفضّلات والملاحظات والدراسة.
        </p>
      </div>
    </DashboardShell>
  );
}
