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
  getTahfeezPortfolio,
  isCloudSyncConfigured,
} from "@/lib/cloud-sync";
import { emptyTahfeezPortfolio } from "@/lib/tahfeez/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Tahfeez" });
  return { title: t("portfolioTitle") };
}

export default async function AccountTahfeezPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("Tahfeez");
  const session = await auth();
  if (!session?.user) redirectLocalized("/login", locale);

  const portfolio = isCloudSyncConfigured()
    ? await getTahfeezPortfolio(session.user.email!)
    : emptyTahfeezPortfolio();
  const stats = portfolio.stats;

  return (
    <DashboardShell
      area="account"
      role={session.user.role}
      kicker="عربية"
      title={t("portfolioTitle")}
      subtitle={t("portfolioSubtitle")}
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      backHref="/account"
      backLabel="←"
    >
      <div className="dash-stack">
        <div className="dash-card dash-card--accent">
          <p>
            <Link href="/tahfeez">{locale === "en" ? "Open smart recitation" : "فتح التسميع الذكي"}</Link>
          </p>
        </div>
        <div className="dash-card">
          <h2 className="text-lg font-semibold">
            {locale === "en" ? "Summary" : "ملخص"}
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              {locale === "en" ? "Sessions" : "الجلسات"}: {stats.totalSessions}
            </li>
            <li>
              {locale === "en" ? "Overall accuracy" : "الدقة العامة"}:{" "}
              {stats.overallAccuracy}%
            </li>
            <li>
              {locale === "en" ? "Correct words" : "كلمات صحيحة"}:{" "}
              {stats.totalCorrectWords}
            </li>
            <li>
              {locale === "en" ? "Wrong words" : "كلمات خاطئة"}:{" "}
              {stats.totalWrongWords}
            </li>
            <li>
              {locale === "en" ? "Strong clears" : "إنجازات قوية"}:{" "}
              {stats.pagesCompleted}
            </li>
          </ul>
        </div>
        <div className="dash-card">
          <h2 className="text-lg font-semibold">
            {locale === "en" ? "Recent sessions" : "آخر الجلسات"}
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {portfolio.sessions.length === 0 ? (
              <li className="text-muted-foreground">
                {locale === "en" ? "No sessions yet." : "لا جلسات بعد."}
              </li>
            ) : (
              portfolio.sessions.slice(0, 30).map((s) => (
                <li key={s.id}>
                  {s.surahName} · {s.ayahStart}
                  {s.ayahEnd !== s.ayahStart ? `–${s.ayahEnd}` : ""} · {s.accuracy}% ·{" "}
                  {new Date(s.completedAt).toLocaleString(locale)}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </DashboardShell>
  );
}
