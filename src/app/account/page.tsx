import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { CloudSyncPanel } from "@/components/CloudSyncPanel";
import { isCloudSyncConfigured } from "@/lib/cloud-sync";
import { canAccessAdmin, canAccessStudio, roleLabelAr } from "@/lib/roles";

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

      <section className="account-grid" aria-label="أقسام الحساب">
        <article className="account-panel">
          <h2>متابعة القراءة</h2>
          <p>
            {syncReady
              ? "استخدم أزرار المزامنة أدناه لنقل آخر صفحة بين أجهزتك."
              : "قريبًا: آخر صفحة مصحف متزامنة مع حسابك."}
          </p>
          <Link href="/mushaf/1" className="account-panel-link">
            فتح المصحف
          </Link>
        </article>
        <article className="account-panel">
          <h2>المفضّلات والملاحظات</h2>
          <p>
            {syncReady
              ? "تُزامن تلقائيًا مع حسابك بعد تسجيل الدخول."
              : "حاليًا تُحفظ على جهازك فقط إلى أن يكتمل ربط D1."}
          </p>
        </article>
        <article className="account-panel">
          <h2>عادة القراءة</h2>
          <p>
            {syncReady
              ? "الهدف والسلسلة يُرفعان مع بقية بياناتك عند المزامنة."
              : "الهدف اليومي والسلسلة سيظهران هنا بعد تفعيل المزامنة."}
          </p>
        </article>
        {(canAccessStudio(role) || canAccessAdmin(role)) && (
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
        )}
      </section>

      {syncReady ? (
        <CloudSyncPanel />
      ) : (
        <section className="account-panel" aria-label="حالة المزامنة">
          <h2>المزامنة السحابية</h2>
          <p>
            قاعدة D1 جاهزة. نُكمل نشر عامل Cloudflare وربط المفاتيح، ثم تظهر هنا
            أزرار الرفع والسحب.
          </p>
        </section>
      )}

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
