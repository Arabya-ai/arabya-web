import Link from "next/link";
import type { Metadata } from "next";
import {
  auth,
  getAuthEnvDiagnostics,
  isGoogleAuthConfigured,
  signIn,
} from "@/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
  description: "ادخل إلى حسابك في عربية عبر Google",
};

/** Always render with current server env (Vercel secrets). */
export const dynamic = "force-dynamic";

function errorMessageAr(code: string | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "Configuration":
      return "إعداد الدخول على السيرفر غير مكتمل، أو Google رفض معرّف العميل (invalid_client). أعد لصق AUTH_GOOGLE_ID و AUTH_GOOGLE_SECRET في Vercel بدون مسافات أو علامات اقتباس، ثم Redeploy.";
    case "AccessDenied":
      return "رُفض الدخول. إن كان التطبيق في وضع الاختبار، أضف بريدك كـ Test user في Google.";
    case "OAuthAccountNotLinked":
      return "هذا البريد مرتبط بطريقة دخول أخرى.";
    case "banned":
    case "Banned":
      return "هذا الحساب محظور. لا يمكن تسجيل الدخول بنفس البريد مرة أخرى حتى يُرفع الحظر من الإدارة.";
    default:
      return `تعذّر تسجيل الدخول (${code}). أعد المحاولة أو راجع إعدادات Google.`;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; diag?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/account");

  const { error, diag } = await searchParams;
  const ready = isGoogleAuthConfigured();
  const errorText = errorMessageAr(error);
  const showDiag = diag === "1" || Boolean(error);
  const diagnostics = showDiag ? getAuthEnvDiagnostics() : null;

  return (
    <div className="shell page-block auth-page">
      <div className="auth-card">
        <p className="auth-kicker">عربية</p>
        <h1>تسجيل الدخول</h1>
        <p className="auth-lead">
          اربط حساب Google للمتابعة بين أجهزتك: المفضّلات، الملاحظات، وعادة
          القراءة. قراءة المصحف والدراسة تبقى متاحة بدون حساب.
        </p>

        {errorText ? (
          <div className="auth-setup-note" role="alert">
            <p>{errorText}</p>
          </div>
        ) : null}

        {diagnostics ? (
          <div className="auth-setup-note" role="status">
            <p>
              فحص الإعداد (بدون أسرار): سر الجلسة=
              {diagnostics.hasSecret ? "موجود" : "ناقص"} · Google ID=
              {diagnostics.hasGoogleId ? "موجود" : "ناقص"} · Google Secret=
              {diagnostics.hasGoogleSecret ? "موجود" : "ناقص"}
              <br />
              AUTH_URL: <code>{diagnostics.authUrl}</code>
              <br />
              نهاية Client ID: <code>{diagnostics.googleIdTail}</code>
            </p>
          </div>
        ) : null}

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
          {" · "}
          <Link href="/login?diag=1">فحص الإعداد</Link>
        </p>
      </div>
    </div>
  );
}
