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
import { ArabyaPanel } from "@/components/ui/ArabyaPanel";
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
      backLabel={t("backToAccount")}
    >
      <div className="dash-stack">
        <ArabyaPanel as="div" accent legacyDash>
          <p>
            <Link href="/tahfeez">{t("openSession")}</Link>
          </p>
        </ArabyaPanel>
        <ArabyaPanel
          as="div"
          legacyDash
          title={locale === "en" ? "Summary" : "ملخص"}
        >
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
        </ArabyaPanel>
        <ArabyaPanel
          as="div"
          legacyDash
          title={locale === "en" ? "Recent sessions" : "آخر الجلسات"}
        >
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
        </ArabyaPanel>
      </div>
    </DashboardShell>
  );
}
