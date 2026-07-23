import Link from "next/link";
import type { Metadata } from "next";
import { auth, isGoogleAuthConfigured, signIn } from "@/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
  description: "ادخل إلى حسابك في عربية عبر Google",
};

/** Always render with current server env (Vercel secrets). */
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/account");

  const ready = isGoogleAuthConfigured();

  return (
    <div className="shell page-block auth-page">
      <div className="auth-card">
        <p className="auth-kicker">عربية</p>
        <h1>تسجيل الدخول</h1>
        <p className="auth-lead">
          اربط حساب Google للمتابعة بين أجهزتك: المفضّلات، الملاحظات، وعادة
          القراءة. قراءة المصحف والدراسة تبقى متاحة بدون حساب.
        </p>

        {ready ? (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/account" });
            }}
          >
            <button type="submit" className="auth-google-cta">
              المتابعة مع Google
            </button>
          </form>
        ) : (
          <div className="auth-setup-note" role="status">
            <p>
              تسجيل الدخول غير مفعّل بعد على هذا الجهاز. يحتاج المالك إكمال إعداد
              مفاتيح Google (الدليل في{" "}
              <code>docs/platform/accounts-owner-guide-ar.md</code>).
            </p>
          </div>
        )}

        <p className="auth-foot">
          <Link href="/">العودة للصفحة الرئيسية</Link>
          {" · "}
          <Link href="/privacy">الخصوصية</Link>
        </p>
      </div>
    </div>
  );
}
