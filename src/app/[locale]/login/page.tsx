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
  if (session?.user) redirectLocalized("/account", locale);

  const t = await getTranslations("Auth");
  const { error, diag, callbackUrl } = await searchParams;
  const ready = isGoogleAuthConfigured();
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
        ) : (
          <div className="auth-setup-note" role="status">
            <p>{t("notConfigured")}</p>
          </div>
        )}

        <p className="auth-foot">
          <Link href="/">{t("backHome")}</Link>
          {" · "}
          <Link href="/privacy">{t("privacy")}</Link>
          {" · "}
          <Link href="/login?diag=1">{t("diag")}</Link>
        </p>
      </div>
    </div>
  );
}
