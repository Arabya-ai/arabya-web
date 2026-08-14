import { Link } from "@/i18n/navigation";
import {
  redirectLocalized,
  resolveLocale,
} from "@/i18n/locale-params";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  auth,
  getAuthEnvDiagnostics,
  isGoogleAuthConfigured,
  signIn,
} from "@/auth";
import { isE2eAuthEnabled } from "@/lib/e2e-auth";
import { safeInternalPath } from "@/lib/safe-path";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; diag?: string; callbackUrl?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

function errorMessage(
  code: string | undefined,
  t: Awaited<ReturnType<typeof getTranslations>>,
): string | null {
  if (!code) return null;
  switch (code) {
    case "Configuration":
      return t("errorConfiguration");
    case "AccessDenied":
      return t("errorAccessDenied");
    case "OAuthAccountNotLinked":
      return t("errorOAuthAccountNotLinked");
    case "banned":
    case "Banned":
      return t("errorBanned");
    default:
      return t("errorDefault", { code });
  }
}

export default async function LoginPage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);

  const session = await auth();
  if (session?.user && session.error !== "Banned") {
    redirectLocalized("/account", locale);
  }

  const t = await getTranslations("Auth");
  const { error, diag, callbackUrl } = await searchParams;
  const ready = isGoogleAuthConfigured();
  const e2eReady = isE2eAuthEnabled();
  const errorText = errorMessage(error, t);
  const showDiag = diag === "1" || Boolean(error);
  const diagnostics = showDiag ? getAuthEnvDiagnostics() : null;
  const defaultAfterLogin = locale === "en" ? "/en/account" : "/account";
  const redirectTo = safeInternalPath(callbackUrl, defaultAfterLogin);

  return (
    <div className="shell page-block auth-page">
      <div className="auth-card">
        <p className="auth-kicker">{t("brandKicker")}</p>
        <h1>{t("loginTitle")}</h1>
        <p className="auth-lead">{t("loginLead")}</p>

        {errorText ? (
          <div className="auth-setup-note" role="alert">
            <p>{errorText}</p>
          </div>
        ) : null}

        {diagnostics ? (
          <div className="auth-setup-note" role="status">
            <p>
              {t("diagLead")} {t("diagSecret")}=
              {diagnostics.hasSecret ? t("diagPresent") : t("diagMissing")} ·{" "}
              {t("diagGoogleId")}=
              {diagnostics.hasGoogleId ? t("diagPresent") : t("diagMissing")} ·{" "}
              {t("diagGoogleSecret")}=
              {diagnostics.hasGoogleSecret ? t("diagPresent") : t("diagMissing")}
              <br />
              {t("diagAuthUrl")}: <code>{diagnostics.authUrl}</code>
              <br />
              {t("diagClientIdTail")}: <code>{diagnostics.googleIdTail}</code>
            </p>
          </div>
        ) : null}

        {ready ? (
          <form
            action={async () => {
              "use server";
              await signIn("google", {
                redirectTo,
              });
            }}
          >
            <button type="submit" className="auth-google-cta">
              {t("continueGoogle")}
            </button>
          </form>
        ) : null}

        {e2eReady ? (
          <form
            className="auth-e2e-form"
            action={async (formData) => {
              "use server";
              const email = String(formData.get("email") || "").trim();
              await signIn("e2e", {
                email,
                redirectTo,
              });
            }}
          >
            <label className="auth-setup-note" htmlFor="e2e-email">
              دخول اختبار محلي (E2E فقط — لا يظهر على الإنتاج)
            </label>
            <input
              id="e2e-email"
              name="email"
              type="email"
              required
              defaultValue="e2e@arabya.local"
              className="auth-e2e-input"
              dir="ltr"
            />
            <button type="submit" className="auth-btn auth-btn--account">
              دخول اختبار
            </button>
          </form>
        ) : null}

        {!ready && !e2eReady ? (
          <div className="auth-setup-note" role="status">
            <p>{t("notConfigured")}</p>
          </div>
        ) : null}

        <p className="auth-foot">
          <Link href="/">{t("backHome")}</Link>
          {" · "}
          <Link href="/privacy">{t("privacy")}</Link>
          {" · "}
          <Link href="/terms">{t("terms")}</Link>
          {" · "}
          <Link href="/login?diag=1">{t("diag")}</Link>
        </p>
      </div>
    </div>
  );
}
