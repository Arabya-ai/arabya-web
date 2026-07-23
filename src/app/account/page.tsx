import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { AccountPersonalData } from "@/components/AccountPersonalData";
import { CloudSyncPanel } from "@/components/CloudSyncPanel";
import { isCloudSyncConfigured } from "@/lib/cloud-sync";
import { canAccessAdmin, canAccessStudio, roleLabelAr } from "@/lib/roles";
import Link from "next/link";

export const metadata: Metadata = {
  title: "حسابي",
  description: "لوحة المشترك في عربية",
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role ?? "user";
  const name = session.user.name || "مشترك عربية";
  const email = session.user.email || "";
  const syncReady = isCloudSyncConfigured();

  return (
    <div className="shell page-block account-page">
      <header className="account-hero">
        <div className="account-hero-text">
          <p className="auth-kicker">حساب المشترك</p>
          <h1>{name}</h1>
          <p className="account-email">{email}</p>
          <p className="account-role-pill">الدور: {roleLabelAr(role)}</p>
        </div>
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt=""
            className="account-hero-avatar"
            width={88}
            height={88}
          />
        ) : (
          <div className="account-hero-avatar account-hero-avatar--fallback" aria-hidden>
            {name.slice(0, 1)}
          </div>
        )}
      </header>

      <section className="account-grid account-grid--personal" aria-label="بياناتك">
        <AccountPersonalData />
      </section>

      {(canAccessStudio(role) || canAccessAdmin(role)) && (
        <section className="account-grid" aria-label="مساحات العمل">
          <article className="account-panel account-panel--accent">
            <h2>مساحات العمل</h2>
            <p>لديك صلاحيات إضافية حسب دورك.</p>
            <div className="account-panel-actions">
              {canAccessStudio(role) ? (
                <Link href="/studio" className="account-panel-link">
                  لوحة المحرر
                </Link>
              ) : null}
              {canAccessAdmin(role) ? (
                <Link href="/admin" className="account-panel-link">
                  لوحة المدير
                </Link>
              ) : null}
            </div>
          </article>
        </section>
      )}

      {syncReady ? <CloudSyncPanel /> : null}

      <form
        className="account-signout"
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button type="submit" className="auth-btn auth-btn--ghost">
          تسجيل الخروج
        </button>
      </form>
    </div>
  );
}
